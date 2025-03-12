import { randomBetween, randomNum } from "./utils";

export function vec3(x: number, y: number, z: number) {
  return new Vec3(x, y, z);
}

export function point3(x: number, y: number, z: number) {
  return new Vec3(x, y, z);
}

export function color(r: number, g: number, b: number) {
  return new Vec3(r, g, b);
}

export class Vec3 {
  constructor(
    public x: number,
    public y: number,
    public z: number,
  ) {}

  sub(v: Vec3): Vec3 {
    const w = this.clone();
    w.x -= v.x;
    w.y -= v.y;
    w.z -= v.z;
    return w;
  }

  add(v: Vec3): Vec3 {
    const w = this.clone();
    w.x += v.x;
    w.y += v.y;
    w.z += v.z;
    return w;
  }

  dot(v: Vec3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  get unit(): Vec3 {
    if (this.length === 0) {
      throw new Error("Finding unit of length 0 vec");
    }
    return this.clone().k(1 / this.length);
  }

  k(n: number): Vec3 {
    const v = this.clone();
    v.x *= n;
    v.y *= n;
    v.z *= n;
    return v;
  }

  div(n: number): Vec3 {
    return this.k(1 / n);
  }

  get [0]() {
    return this.x;
  }
  get [1]() {
    return this.y;
  }
  get [2]() {
    return this.z;
  }

  toString() {
    return `${this.x},${this.y},${this.z}`;
  }

  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  get lengthSquared() {
    return Vec3.dot(this, this);
  }

  get length() {
    return Math.sqrt(this.lengthSquared);
  }

  static dot(v: Vec3, u: Vec3): number {
    return v.x * u.x + v.y * u.y + v.z * u.z;
  }

  static random() {
    return vec3(randomNum(), randomNum(), randomNum());
  }

  static randomBetween(min: number, max: number) {
    return vec3(
      randomBetween(min, max),
      randomBetween(min, max),
      randomBetween(min, max),
    );
  }

  static randomUnitVector() {
    while (true) {
      const p = this.randomBetween(-1, 1);
      const { lengthSquared } = p;
      // Javascript numbers are double (64-bit) so we can use the same value for minimum
      if (1e-160 < lengthSquared && lengthSquared <= 1) {
        return p.div(Math.sqrt(lengthSquared));
      }
    }
  }

  static randomOnHemisphere(normal: Vec3) {
    const onUnitSphere = this.randomUnitVector();
    if (this.dot(onUnitSphere, normal) > 0.0) {
      return onUnitSphere;
    } else {
      return onUnitSphere.k(-1);
    }
  }
}
