import { Ray, ray } from "./ray";
import { randomNum } from "./utils";
import {
  Vec3,
  color,
  vecDot,
  vecK,
  vecAdd,
  vecNearZero,
  vecReflect,
  vecRefract,
  vecRandomUnitVector,
  vecUnit,
} from "./vec3";

export type Material =
  | { type: "lambertian"; albedo: Vec3 }
  | { type: "metal"; albedo: Vec3; fuzz: number }
  | { type: "dielectric"; refractionIndex: number };

export function lambertian(albedo: Vec3): Material {
  return { type: "lambertian", albedo };
}

export function metal(albedo: Vec3, fuzz: number): Material {
  return { type: "metal", albedo, fuzz: fuzz < 1 ? fuzz : 1 };
}

export function dielectric(refractionIndex: number): Material {
  return { type: "dielectric", refractionIndex };
}

export interface ScatterResult {
  scattered: Ray;
  attenuation: Vec3;
}

export function scatter(
  material: Material,
  rayIn: Ray,
  recP: Vec3,
  recNormal: Vec3,
  recFrontFace: boolean,
): ScatterResult | null {
  switch (material.type) {
    case "lambertian":
      return scatterLambertian(material.albedo, recP, recNormal);
    case "metal":
      return scatterMetal(material.albedo, material.fuzz, rayIn, recP, recNormal);
    case "dielectric":
      return scatterDielectric(material.refractionIndex, rayIn, recP, recNormal, recFrontFace);
  }
}

function scatterLambertian(
  albedo: Vec3,
  p: Vec3,
  normal: Vec3,
): ScatterResult {
  let scatterDirection = vecAdd(normal, vecRandomUnitVector());
  if (vecNearZero(scatterDirection)) {
    scatterDirection = normal;
  }
  return { scattered: ray(p, scatterDirection), attenuation: albedo };
}

function scatterMetal(
  albedo: Vec3,
  fuzz: number,
  rayIn: Ray,
  p: Vec3,
  normal: Vec3,
): ScatterResult | null {
  let reflected = vecReflect(rayIn.direction, normal);
  reflected = vecAdd(vecUnit(reflected), vecK(vecRandomUnitVector(), fuzz));
  const scattered = ray(p, reflected);
  if (vecDot(scattered.direction, normal) > 0) {
    return { scattered, attenuation: albedo };
  }
  return null;
}

function scatterDielectric(
  refractionIndex: number,
  rayIn: Ray,
  p: Vec3,
  normal: Vec3,
  frontFace: boolean,
): ScatterResult {
  const attenuation = color(1, 1, 1);
  const ri = frontFace ? 1.0 / refractionIndex : refractionIndex;
  const unitDirection = vecUnit(rayIn.direction);

  const cosTheta = Math.min(vecDot(vecK(unitDirection, -1), normal), 1.0);
  const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
  const cannotRefract = ri * sinTheta > 1;

  let direction: Vec3;
  if (cannotRefract || reflectance(cosTheta, ri) > randomNum()) {
    direction = vecReflect(unitDirection, normal);
  } else {
    direction = vecRefract(unitDirection, normal, ri);
  }

  return { scattered: ray(p, direction), attenuation };
}

function reflectance(cosine: number, refractionIndex: number): number {
  let r0 = (1 - refractionIndex) / (1 + refractionIndex);
  r0 = r0 * r0;
  return r0 + (1 - r0) * Math.pow(1 - cosine, 5);
}
