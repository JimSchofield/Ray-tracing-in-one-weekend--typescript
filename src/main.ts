import { Camera } from "./camera";
import { HittableList } from "./hittable-list";
import { Sphere } from "./sphere";
import { point3 } from "./vec3";

const canvas = document.querySelector("canvas");
if (!canvas) throw new Error("No canvas");
const ctx = canvas?.getContext("2d");
if (!ctx) throw new Error("No ctx");

// World
const world = new HittableList();
world.add(new Sphere(point3(0, 0, -1), 0.5));
world.add(new Sphere(point3(0, -100.5, -1), 100));

const cam = new Camera(canvas, ctx, 800, 16 / 9, 100);

cam.render(world);
