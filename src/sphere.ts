import { HitRecord, hitRecord, setFaceNormal } from "./hittable";
import { Interval, intervalSurrounds } from "./interval";
import { Material } from "./material";
import { Ray, rayAt } from "./ray";
import { Vec3, vecDot, vecDiv, vecLengthSquared, vecSub } from "./vec3";

export interface Sphere {
  center: Vec3;
  radius: number;
  material: Material;
}

export function sphere(center: Vec3, radius: number, material: Material): Sphere {
  return { center, radius, material };
}

export function sphereHit(
  s: Sphere,
  r: Ray,
  rayT: Interval,
): [boolean, HitRecord] {
  const rec = hitRecord();
  const oc = vecSub(s.center, r.origin);
  const a = vecLengthSquared(r.direction);
  const h = vecDot(r.direction, oc);
  const c = vecLengthSquared(oc) - s.radius * s.radius;
  const discriminant = h * h - a * c;

  if (discriminant < 0) {
    return [false, rec];
  }

  let root = (h - Math.sqrt(discriminant)) / a;

  if (!intervalSurrounds(rayT, root)) {
    root = (h + Math.sqrt(discriminant)) / a;

    if (!intervalSurrounds(rayT, root)) {
      return [false, rec];
    }
  }

  rec.t = root;
  rec.p = rayAt(r, rec.t);
  const outwardNormal = vecDiv(vecSub(rec.p, s.center), s.radius);
  const { frontFace, normal } = setFaceNormal(r, outwardNormal);
  rec.frontFace = frontFace;
  rec.normal = normal;
  rec.material = s.material;

  return [true, rec];
}
