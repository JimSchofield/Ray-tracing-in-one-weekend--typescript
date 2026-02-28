import { Material } from "./material";
import { Ray } from "./ray";
import { Vec3, vec3, vecDot, vecK } from "./vec3";

export interface HitRecord {
  p: Vec3;
  normal: Vec3;
  t: number;
  frontFace: boolean;
  material: Material;
}

export function hitRecord(): HitRecord {
  return {
    p: vec3(0, 0, 0),
    normal: vec3(0, 0, 0),
    t: 0,
    frontFace: false,
    material: { type: "lambertian", albedo: vec3(0, 0, 0) },
  };
}

export function setFaceNormal(r: Ray, outwardNormal: Vec3): { frontFace: boolean; normal: Vec3 } {
  const frontFace = vecDot(r.direction, outwardNormal) < 0;
  const normal = frontFace ? outwardNormal : vecK(outwardNormal, -1);
  return { frontFace, normal };
}
