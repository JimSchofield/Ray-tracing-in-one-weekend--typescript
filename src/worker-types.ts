import { CameraState } from "./camera";
import { Sphere } from "./sphere";

export interface RenderWorkerInput {
  camState: CameraState;
  world: Sphere[];
  startRow: number;
  endRow: number;
}

export interface GpuRenderWorkerInput {
  camState: CameraState;
  world: Sphere[];
  startRow: number;
  endRow: number;
  rngSeed: number;
}

export interface RenderWorkerOutput {
  startRow: number;
  endRow: number;
  pixels: Uint8ClampedArray;
}
