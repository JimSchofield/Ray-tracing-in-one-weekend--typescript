import { Camera } from "./camera";
import { dielectric, lambertian, metal } from "./material";
import { sphere, Sphere } from "./sphere";
import { randomBetween, randomNum } from "./utils";
import {
  color,
  point3,
  vecMul,
  vecRandom,
  vecRandomBetween,
  vecSub,
  vecLength,
} from "./vec3";

function main() {
  const world: Sphere[] = [];

  const ground = lambertian(color(0.5, 0.5, 0.5));
  world.push(sphere(point3(0, -1000, -1), 1000, ground));

  for (let a = -11; a < 11; a++) {
    for (let b = -11; b < 11; b++) {
      const chooseMaterial = randomNum();
      const center = point3(a + 0.9 * randomNum(), 0.2, b + 0.9 * randomNum());

      if (vecLength(vecSub(center, point3(4, 0.2, 0))) > 0.9) {
        if (chooseMaterial < 0.8) {
          const albedo = vecMul(vecRandom(), vecRandom());
          const material = lambertian(albedo);
          world.push(sphere(center, 0.2, material));
        } else if (chooseMaterial < 0.95) {
          const albedo = vecRandomBetween(0.5, 1);
          const fuzz = randomBetween(0, 0.5);
          const material = metal(albedo, fuzz);
          world.push(sphere(center, 0.2, material));
        } else {
          const material = dielectric(1.5);
          world.push(sphere(center, 0.2, material));
        }
      }
    }
  }
  const material1 = dielectric(1.5);
  world.push(sphere(point3(0, 1, 0), 1.0, material1));

  const material2 = lambertian(color(0.4, 0.2, 0.1));
  world.push(sphere(point3(-4, 1, 0), 1.0, material2));

  const material3 = metal(color(0.7, 0.6, 0.5), 0.0);
  world.push(sphere(point3(4, 1, 0), 1.0, material3));

  const width = document.querySelector<HTMLInputElement>("input")!;

  const aspectRatio = 16 / 9;

  const cam = new Camera({
    width: Number(width.value),
    aspectRatio,
    samplesPerPixel: 100,
    maxDepth: 50,
    vfov: 20,
    lookFrom: point3(13, 2, 3),
    lookAt: point3(0, 0, 0),
    defocusAngle: 0.6,
    focusDist: 10,
  });

  cam.renderParallel(world);
}

document.getElementById("button")!.onclick = main;
