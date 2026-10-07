import { useEffect, useRef, useState } from "react";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/muscle-map";

type Props = {
  active: Set<MuscleGroup>;
  selected?: MuscleGroup | null;
  onSelect?: (group: MuscleGroup) => void;
};
type Point = readonly [number, number];

const WIDTH = 418;
const HEIGHT = 554;
const ACTIVE_RGB = [255, 69, 58] as const;

// Each seed is inside a muscle area of the original body-base.png. Flood filling
// recolours the base pixels themselves, so the coloured shape can never drift
// away from the anatomy or cover its outlines.
const MUSCLE_SEEDS: Record<MuscleGroup, readonly Point[]> = {
  shoulders: [
    [55, 116],
    [159, 116],
    [250, 120],
    [369, 121],
  ],
  chest: [
    [82, 122],
    [132, 122],
  ],
  biceps: [
    [52, 160],
    [162, 160],
  ],
  triceps: [
    [250, 160],
    [374, 160],
  ],
  forearms: [
    [40, 218],
    [174, 218],
    [240, 218],
    [384, 218],
  ],
  back: [
    [282, 121],
    [342, 121],
    [280, 170],
    [344, 170],
    [312, 180],
  ],
  abs: [
    [88, 175],
    [120, 175],
    [88, 205],
    [120, 205],
    [90, 233],
    [120, 235],
  ],
  quads: [
    [82, 310],
    [96, 300],
    [118, 300],
    [134, 310],
    [85, 350],
    [131, 350],
  ],
  hamstrings: [
    [278, 310],
    [293, 313],
    [328, 310],
    [346, 310],
    [282, 355],
    [342, 355],
  ],
  glutes: [
    [284, 248],
    [340, 248],
  ],
  calves: [
    [276, 421],
    [345, 421],
    [286, 445],
    [338, 445],
  ],
  tibialis: [
    [84, 420],
    [129, 420],
    [83, 451],
    [132, 455],
  ],
};

function floodRecolour(
  data: Uint8ClampedArray,
  activeMask: Uint8Array,
  seedX: number,
  seedY: number,
) {
  const seedIndex = (seedY * WIDTH + seedX) * 4;
  const sr = data[seedIndex];
  const sg = data[seedIndex + 1];
  const sb = data[seedIndex + 2];
  if (sr < 48 || sr > 95 || Math.abs(sr - sg) > 8) return;

  const visited = new Uint8Array(WIDTH * HEIGHT);
  const stack: number[] = [seedY * WIDTH + seedX];
  while (stack.length) {
    const pixel = stack.pop()!;
    if (visited[pixel]) continue;
    visited[pixel] = 1;
    const offset = pixel * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    if (Math.abs(r - sr) > 13 || Math.abs(g - sg) > 13 || Math.abs(b - sb) > 13) continue;

    data[offset] = ACTIVE_RGB[0];
    data[offset + 1] = ACTIVE_RGB[1];
    data[offset + 2] = ACTIVE_RGB[2];
    activeMask[pixel] = 1;

    const x = pixel % WIDTH;
    const y = Math.floor(pixel / WIDTH);
    if (x > 0) stack.push(pixel - 1);
    if (x < WIDTH - 1) stack.push(pixel + 1);
    if (y > 0) stack.push(pixel - WIDTH);
    if (y < HEIGHT - 1) stack.push(pixel + WIDTH);
  }
}

export function MuscleSilhouette({ active, selected, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const masksRef = useRef<Partial<Record<MuscleGroup, Uint8Array>>>({});
  const [failed, setFailed] = useState(false);
  const activeKey = [...active].sort().join(",");
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      context.drawImage(image, 0, 0, WIDTH, HEIGHT);
      const pixels = context.getImageData(0, 0, WIDTH, HEIGHT);
      const original = new Uint8ClampedArray(pixels.data);
      const masks: Partial<Record<MuscleGroup, Uint8Array>> = {};
      for (const group of Object.keys(MUSCLE_SEEDS) as MuscleGroup[]) {
        const copy = new Uint8ClampedArray(original);
        const mask = new Uint8Array(WIDTH * HEIGHT);
        for (const [x, y] of MUSCLE_SEEDS[group]) floodRecolour(copy, mask, x, y);
        masks[group] = mask;
        const colour =
          group === selected ? [255, 190, 60] : active.has(group) ? ACTIVE_RGB : [100, 105, 115];
        for (let pixel = 0; pixel < mask.length; pixel++)
          if (mask[pixel]) {
            const offset = pixel * 4;
            pixels.data[offset] = colour[0];
            pixels.data[offset + 1] = colour[1];
            pixels.data[offset + 2] = colour[2];
          }
      }
      masksRef.current = masks;
      context.putImageData(pixels, 0, 0);
    };
    image.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    image.src = "/muscle-map/body-base.png";
    return () => {
      cancelled = true;
    };
  }, [activeKey, selected]);
  const pick = (clientX: number, clientY: number) => {
    if (!onSelect || !canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const x = Math.floor(((clientX - bounds.left) * WIDTH) / bounds.width);
    const y = Math.floor(((clientY - bounds.top) * HEIGHT) / bounds.height);
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
    let best: MuscleGroup | undefined;
    let distance = Infinity;
    // A small tolerance around an outline makes anatomical areas easier to tap.
    for (const group of Object.keys(MUSCLE_SEEDS) as MuscleGroup[]) {
      const mask = masksRef.current[group];
      if (!mask) continue;
      for (let dy = -10; dy <= 10; dy++)
        for (let dx = -10; dx <= 10; dx++) {
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= WIDTH || ny >= HEIGHT) continue;
          const d = dx * dx + dy * dy;
          if (mask[ny * WIDTH + nx] && d < distance) {
            best = group;
            distance = d;
          }
        }
    }
    if (best) onSelect(best);
  };
  return (
    <div className="rounded-2xl bg-[#20201e] p-3">
      <div className="mb-2 grid grid-cols-2 text-center text-sm text-label-secondary">
        <span>Davanti</span>
        <span>Dietro</span>
      </div>
      {!failed && (
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          role="img"
          aria-label="Mappa muscolare: rosso allenato, grigio non coinvolto, giallo selezionato"
          onClick={(event) => pick(event.clientX, event.clientY)}
          className="mx-auto block h-auto w-full max-w-[418px]"
          style={{ aspectRatio: `${WIDTH}/${HEIGHT}`, cursor: onSelect ? "pointer" : "default" }}
        />
      )}
      <div className="mt-3 flex flex-wrap justify-center gap-3 text-sm text-label-secondary">
        <span>
          <i className="inline-block size-2 rounded-full bg-accent" /> Allenati
        </span>
        <span>
          <i className="inline-block size-2 rounded-full bg-[#646973]" /> Non coinvolti
        </span>
        {selected && (
          <span>
            <i className="inline-block size-2 rounded-full bg-[#ffbe3c]" /> Selezionato
          </span>
        )}
      </div>
      {onSelect && (
        <div
          className="mt-3 flex flex-wrap justify-center gap-2"
          aria-label="Gruppi muscolari allenati"
        >
          {[...active].map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => onSelect(group)}
              aria-pressed={selected === group}
              className={
                "min-h-11 rounded-full border px-3 text-sm font-semibold " +
                (selected === group ? "border-warning text-warning" : "border-separator text-label")
              }
            >
              {MUSCLE_LABELS[group]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
