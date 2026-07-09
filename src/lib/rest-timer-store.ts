import { create } from "zustand";

interface RestTimerState {
  running: boolean;
  endsAt: number; // epoch ms
  duration: number; // seconds (original)
  exerciseId: string | null;
  now: number;
  start: (seconds: number, exerciseId: string) => void;
  addSeconds: (delta: number) => void;
  skip: () => void;
  tick: () => void;
  _fired: boolean;
}

const STORAGE_KEY = "rest_timer_state_v1";

function loadInitial(): Partial<RestTimerState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const s = JSON.parse(raw);
    if (s.running && s.endsAt > Date.now()) {
      return {
        running: true,
        endsAt: s.endsAt,
        duration: s.duration,
        exerciseId: s.exerciseId ?? null,
      };
    }
  } catch {}
  return {};
}

function persist(s: RestTimerState) {
  if (typeof window === "undefined") return;
  if (s.running) {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        running: s.running,
        endsAt: s.endsAt,
        duration: s.duration,
        exerciseId: s.exerciseId,
      }),
    );
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

function beep() {
  try {
    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

export const useRestTimer = create<RestTimerState>((set, get) => {
  const initial = loadInitial();
  return {
    running: initial.running ?? false,
    endsAt: initial.endsAt ?? 0,
    duration: initial.duration ?? 0,
    exerciseId: initial.exerciseId ?? null,
    now: Date.now(),
    _fired: false,
    start: (seconds, exerciseId) => {
      const endsAt = Date.now() + seconds * 1000;
      const next: RestTimerState = {
        ...get(),
        running: true,
        endsAt,
        duration: seconds,
        exerciseId,
        now: Date.now(),
        _fired: false,
      };
      set(next);
      persist(next);
    },
    addSeconds: (delta) => {
      const s = get();
      if (!s.running) return;
      const newEnds = Math.max(Date.now() + 1000, s.endsAt + delta * 1000);
      const newDur = Math.max(1, s.duration + delta);
      const next = { ...s, endsAt: newEnds, duration: newDur };
      set(next);
      persist(next);
    },
    skip: () => {
      const next = { ...get(), running: false, endsAt: 0, exerciseId: null, _fired: false };
      set(next);
      persist(next);
    },
    tick: () => {
      const s = get();
      const now = Date.now();
      if (!s.running) {
        if (s.now !== now) set({ now });
        return;
      }
      if (now >= s.endsAt && !s._fired) {
        try {
          navigator.vibrate?.([200, 100, 200]);
        } catch {}
        beep();
        const next = { ...s, running: false, now, _fired: true, endsAt: 0, exerciseId: null };
        set(next);
        persist(next);
        return;
      }
      set({ now });
    },
  };
});

// Global ticker
if (typeof window !== "undefined") {
  const loop = () => {
    useRestTimer.getState().tick();
    setTimeout(loop, 250);
  };
  loop();
}
