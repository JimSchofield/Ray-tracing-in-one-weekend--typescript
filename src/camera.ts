import { writeColor } from "./color";
import { HitRecord, Hittable } from "./hittable";
import { interval } from "./interval";
import { ray, Ray } from "./ray";
import { randomNum } from "./utils";
import { color, point3, Vec3, vec3 } from "./vec3";

const sampleSquare = () => vec3(randomNum() - 0.5, randomNum() - 0.5, 0);

export class Camera {
  height: number;
  pixel00Loc!: Vec3;
  pixelDeltaU!: Vec3;
  pixelDeltaV!: Vec3;
  cameraCenter!: Vec3;
  pixelSamplesScale: number;

  constructor(
    public canvas: HTMLCanvasElement,
    public ctx: CanvasRenderingContext2D,
    public width: number = 800,
    public aspectRatio: number = 16 / 9,
    public samplesPerPixel: number = 10,
  ) {
    // Image
    this.height = Math.floor(width / aspectRatio);
    canvas.width = width;
    canvas.height = this.height;

    this.pixelSamplesScale = 1 / samplesPerPixel;

    this.initialize();
  }

  initialize() {
    // Camera
    const focalLength = 1.0;
    const viewportHeight = 2.0;
    const viewportWidth = viewportHeight * (this.width / this.height);
    this.cameraCenter = point3(0, 0, 0);

    const viewportU = vec3(viewportWidth, 0, 0);
    const viewportV = vec3(0, -viewportHeight, 0);

    this.pixelDeltaU = viewportU.div(this.width);
    this.pixelDeltaV = viewportV.div(this.height);

    const viewportUpperLeft = this.cameraCenter
      .sub(vec3(0, 0, focalLength))
      .sub(viewportU.div(2))
      .sub(viewportV.div(2));
    this.pixel00Loc = viewportUpperLeft.add(
      this.pixelDeltaU.add(this.pixelDeltaV).div(2),
    );
  }

  async doPixel(i: number, j: number, world: Hittable) {
    console.log(`Rendering pixel ${i},${j}`);
    let pixelColor = vec3(0, 0, 0);

    for (let sample = 0; sample < this.samplesPerPixel; sample++) {
      const r = this.getRay(i, j);
      pixelColor = pixelColor.add(this.rayColor(r, world));
    }

    writeColor(this.ctx, pixelColor.k(this.pixelSamplesScale), j, i);
  }

  async render(world: Hittable) {
    const stack: (() => ReturnType<typeof this.doPixel>)[] = [];

    for (let j = 0; j <= this.height - 1; j++) {
      for (let i = 0; i <= this.width - 1; i++) {
        stack.push(() => this.doPixel(i, j, world));
      }
    }

    await Promise.all(stack.map((fn) => fn()));
    console.log("Done!");
  }

  rayColor(r: Ray, world: Hittable): Vec3 {
    const rec = new HitRecord();

    const [hasHit, resultRec] = world.hit(r, interval(0, Infinity), rec);
    if (hasHit) {
      const direction = Vec3.randomOnHemisphere(resultRec.normal!);
      return this.rayColor(ray(resultRec.p!, direction), world).k(0.5);
    }

    const unitDirection = r.direction.unit;
    const a = 0.5 * (unitDirection.y + 1.0);

    return color(1.0, 1.0, 1.0)
      .k(1 - a)
      .add(color(0.5, 0.7, 1.0).k(a));
  }

  getRay(i: number, j: number) {
    const offset = sampleSquare();

    const pixelSample = this.pixel00Loc
      .add(this.pixelDeltaU.k(i + offset.x))
      .add(this.pixelDeltaV.k(j + offset.y));

    const rayOrigin = this.cameraCenter;
    const rayDirection = pixelSample.sub(rayOrigin);

    return ray(rayOrigin, rayDirection);
  }
}
