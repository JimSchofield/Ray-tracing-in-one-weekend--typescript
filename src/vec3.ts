import { randomBetween, randomNum } from "./utils";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function point3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function color(r: number, g: number, b: number): Vec3 {
  return { x: r, y: g, z: b };
}

export function vecSub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vecDot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function vecK(v: Vec3, n: number): Vec3 {
  return { x: v.x * n, y: v.y * n, z: v.z * n };
}

export function vecDiv(v: Vec3, n: number): Vec3 {
  return vecK(v, 1 / n);
}

export function vecMul(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x * b.x, y: a.y * b.y, z: a.z * b.z };
}

export function vecLengthSquared(v: Vec3): number {
  return vecDot(v, v);
}

export function vecLength(v: Vec3): number {
  return Math.sqrt(vecLengthSquared(v));
}

export function vecUnit(v: Vec3): Vec3 {
  const len = vecLength(v);
  if (len === 0) throw new Error("Finding unit of length 0 vec");
  return vecK(v, 1 / len);
}

export function vecNearZero(v: Vec3): boolean {
  const s = 1e-8;
  return Math.abs(v.x) < s && Math.abs(v.y) < s && Math.abs(v.z) < s;
}

export function vecReflect(v: Vec3, n: Vec3): Vec3 {
  return vecSub(v, vecK(n, vecDot(v, n) * 2));
}

export function vecRefract(uv: Vec3, n: Vec3, etaiOverEtat: number): Vec3 {
  const cosTheta = Math.min(vecDot(vecK(uv, -1), n), 1.0);
  const rOutPerp = vecK(vecAdd(uv, vecK(n, cosTheta)), etaiOverEtat);
  const rOutParallel = vecK(n, -Math.sqrt(Math.abs(1 - vecLengthSquared(rOutPerp))));
  return vecAdd(rOutPerp, rOutParallel);
}

export function vecCross(u: Vec3, v: Vec3): Vec3 {
  return vec3(
    u.y * v.z - u.z * v.y,
    u.z * v.x - u.x * v.z,
    u.x * v.y - u.y * v.x,
  );
}

export function vecRandom(): Vec3 {
  return vec3(randomNum(), randomNum(), randomNum());
}

export function vecRandomBetween(min: number, max: number): Vec3 {
  return vec3(
    randomBetween(min, max),
    randomBetween(min, max),
    randomBetween(min, max),
  );
}

export function vecRandomUnitVector(): Vec3 {
  while (true) {
    const p = vecRandomBetween(-1, 1);
    const ls = vecLengthSquared(p);
    if (1e-160 < ls && ls <= 1) {
      return vecDiv(p, Math.sqrt(ls));
    }
  }
}

export function vecRandomOnHemisphere(normal: Vec3): Vec3 {
  const onUnitSphere = vecRandomUnitVector();
  if (vecDot(onUnitSphere, normal) > 0.0) {
    return onUnitSphere;
  } else {
    return vecK(onUnitSphere, -1);
  }
}

export function vecRandomInUnitDisk(): Vec3 {
  while (true) {
    const p = vec3(randomBetween(-1, 1), randomBetween(-1, 1), 0);
    if (vecLengthSquared(p) < 1) {
      return p;
    }
  }
}
