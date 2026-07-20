import { useEffect, useRef } from "react";
import type { MuscleGroup } from "@/lib/muscle-map";

type Props = { active: Set<MuscleGroup> };
type Point = readonly [number, number];

const WIDTH = 418;
const HEIGHT = 554;
const ACTIVE_RGB = [255, 86, 0] as const;

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

function floodRecolour(data: Uint8ClampedArray, seedX: number, seedY: number) {
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

    const x = pixel % WIDTH;
    const y = Math.floor(pixel / WIDTH);
    if (x > 0) stack.push(pixel - 1);
    if (x < WIDTH - 1) stack.push(pixel + 1);
    if (y > 0) stack.push(pixel - WIDTH);
    if (y < HEIGHT - 1) stack.push(pixel + WIDTH);
  }
}

export function MuscleSilhouette({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeKey = [...active].sort().join(",");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    let cancelled = false;
    const image = new Image();
    image.src = "/muscle-map/body-base.png";
    image.onload = () => {
      if (cancelled) return;
      context.clearRect(0, 0, WIDTH, HEIGHT);
      context.drawImage(image, 0, 0, WIDTH, HEIGHT);
      const pixels = context.getImageData(0, 0, WIDTH, HEIGHT);
      (activeKey ? (activeKey.split(",") as MuscleGroup[]) : []).forEach((group) => {
        MUSCLE_SEEDS[group].forEach(([x, y]) => floodRecolour(pixels.data, x, y));
      });
      context.putImageData(pixels, 0, 0);
    };
    return () => {
      cancelled = true;
    };
  }, [activeKey]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#20201e] px-2 py-3">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label="Sagoma anatomica con i muscoli allenati colorati"
        className="mx-auto block h-[18rem] max-w-full object-contain"
      />
    </div>
  );
}
