import { Vec3, vecAdd, vecK } from "./vec3";

export interface Ray {
  origin: Vec3;
  direction: Vec3;
}

export function ray(origin: Vec3, direction: Vec3): Ray {
  return { origin, direction };
}

export function rayAt(r: Ray, t: number): Vec3 {
  return vecAdd(r.origin, vecK(r.direction, t));
}
