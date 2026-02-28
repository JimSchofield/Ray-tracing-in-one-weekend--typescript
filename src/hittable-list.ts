import { HitRecord, hitRecord } from "./hittable";
import { interval, Interval } from "./interval";
import { Ray } from "./ray";
import { Sphere, sphereHit } from "./sphere";

export function hittableListHit(
  objects: Sphere[],
  r: Ray,
  rayT: Interval,
): [boolean, HitRecord] {
  let rec = hitRecord();
  let hitAnything = false;
  let closestSoFar = rayT.max;

  for (const obj of objects) {
    const [hasHit, resultRec] = sphereHit(obj, r, interval(rayT.min, closestSoFar));
    if (hasHit) {
      hitAnything = true;
      closestSoFar = resultRec.t;
      rec = resultRec;
    }
  }

  return [hitAnything, rec];
}
