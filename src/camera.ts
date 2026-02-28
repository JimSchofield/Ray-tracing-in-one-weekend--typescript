import { writeColor } from "./color";
import { hittableListHit } from "./hittable-list";
import { interval } from "./interval";
import { scatter } from "./material";
import { ray, Ray } from "./ray";
import { Sphere } from "./sphere";
import { degreesToRadians, randomNum } from "./utils";
import {
  Vec3,
  vec3,
  color,
  point3,
  vecAdd,
  vecCross,
  vecDiv,
  vecK,
  vecMul,
  vecRandomInUnitDisk,
  vecSub,
  vecUnit,
} from "./vec3";

const sampleSquare = () => vec3(randomNum() - 0.5, randomNum() - 0.5, 0);

export interface CameraConfig {
  width: number;
  height: number;
  samplesPerPixel: number;
  maxDepth: number;
  vfov: number;
  lookFrom: Vec3;
  lookAt: Vec3;
  vUp: Vec3;
  defocusAngle: number;
  focusDist: number;
}

export interface CameraState {
  config: CameraConfig;
  pixel00Loc: Vec3;
  pixelDeltaU: Vec3;
  pixelDeltaV: Vec3;
  cameraCenter: Vec3;
  pixelSamplesScale: number;
  defocusDiskU: Vec3;
  defocusDiskV: Vec3;
}

export function initCamera(config: CameraConfig): CameraState {
  const cameraCenter = config.lookFrom;

  const theta = degreesToRadians(config.vfov);
  const h = Math.tan(theta / 2);
  const viewportHeight = 2.0 * h * config.focusDist;
  const viewportWidth = viewportHeight * (config.width / config.height);

  const w = vecUnit(vecSub(config.lookFrom, config.lookAt));
  const u = vecUnit(vecCross(config.vUp, w));
  const v = vecCross(w, u);

  const viewportU = vecK(u, viewportWidth);
  const viewportV = vecK(v, -viewportHeight);

  const pixelDeltaU = vecDiv(viewportU, config.width);
  const pixelDeltaV = vecDiv(viewportV, config.height);

  const viewportUpperLeft = vecSub(
    vecSub(vecSub(cameraCenter, vecK(w, config.focusDist)), vecDiv(viewportU, 2)),
    vecDiv(viewportV, 2),
  );
  const pixel00Loc = vecAdd(viewportUpperLeft, vecDiv(vecAdd(pixelDeltaU, pixelDeltaV), 2));

  const defocusRadius =
    config.focusDist * Math.tan(degreesToRadians(config.defocusAngle / 2));
  const defocusDiskU = vecK(u, defocusRadius);
  const defocusDiskV = vecK(v, defocusRadius);

  return {
    config,
    pixel00Loc,
    pixelDeltaU,
    pixelDeltaV,
    cameraCenter,
    pixelSamplesScale: 1 / config.samplesPerPixel,
    defocusDiskU,
    defocusDiskV,
  };
}

export function getRay(cam: CameraState, i: number, j: number): Ray {
  const offset = sampleSquare();

  const pixelSample = vecAdd(
    vecAdd(cam.pixel00Loc, vecK(cam.pixelDeltaU, i + offset.x)),
    vecK(cam.pixelDeltaV, j + offset.y),
  );

  const rayOrigin =
    cam.config.defocusAngle <= 0 ? cam.cameraCenter : defocusDiskSample(cam);
  const rayDirection = vecSub(pixelSample, rayOrigin);

  return ray(rayOrigin, rayDirection);
}

function defocusDiskSample(cam: CameraState): Vec3 {
  const p = vecRandomInUnitDisk();
  return vecAdd(vecAdd(cam.cameraCenter, vecK(cam.defocusDiskU, p.x)), vecK(cam.defocusDiskV, p.y));
}

export function rayColor(r: Ray, depth: number, world: Sphere[]): Vec3 {
  if (depth <= 0) return color(0, 0, 0);

  const [hasHit, rec] = hittableListHit(world, r, interval(0.0001, Infinity));
  if (hasHit) {
    const result = scatter(rec.material, r, rec.p, rec.normal, rec.frontFace);
    if (result) {
      return vecMul(rayColor(result.scattered, depth - 1, world), result.attenuation);
    }
    return color(0, 0, 0);
  }

  const unitDirection = vecUnit(r.direction);
  const a = 0.5 * (unitDirection.y + 1.0);

  return vecAdd(vecK(color(1.0, 1.0, 1.0), 1 - a), vecK(color(0.5, 0.7, 1.0), a));
}

export class Camera {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  state: CameraState;

  constructor({
    width = 800,
    aspectRatio = 16 / 9,
    samplesPerPixel = 10,
    maxDepth = 10,
    vfov = 90,
    lookFrom = point3(0, 0, 0),
    lookAt = point3(0, 0, -1),
    vUp = vec3(0, 1, 0),
    defocusAngle = 0,
    focusDist = 10,
  }: {
    width?: number;
    aspectRatio?: number;
    samplesPerPixel?: number;
    maxDepth?: number;
    vfov?: number;
    lookFrom?: Vec3;
    lookAt?: Vec3;
    vUp?: Vec3;
    defocusAngle?: number;
    focusDist?: number;
  }) {
    const canvas = document.querySelector("canvas");
    if (!canvas) throw new Error("No canvas");
    this.canvas = canvas;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("No ctx");
    this.ctx = ctx;

    const height = Math.floor(width / aspectRatio);
    this.canvas.width = width;
    this.canvas.height = height;

    this.state = initCamera({
      width,
      height,
      samplesPerPixel,
      maxDepth,
      vfov,
      lookFrom,
      lookAt,
      vUp,
      defocusAngle,
      focusDist,
    });
  }

  render(world: Sphere[]) {
    const { config } = this.state;
    for (let j = 0; j <= config.height - 1; j++) {
      console.log(`Rendering scanline ${j}`);
      for (let i = 0; i <= config.width - 1; i++) {
        let pixelColor = vec3(0, 0, 0);

        for (let sample = 0; sample < config.samplesPerPixel; sample++) {
          const r = getRay(this.state, i, j);
          pixelColor = vecAdd(pixelColor, this.rayColor(r, config.maxDepth, world));
        }

        writeColor(this.ctx, vecK(pixelColor, this.state.pixelSamplesScale), j, i);
      }
    }
    console.log("Done!");
  }

  private rayColor(r: Ray, depth: number, world: Sphere[]): Vec3 {
    return rayColor(r, depth, world);
  }
}
