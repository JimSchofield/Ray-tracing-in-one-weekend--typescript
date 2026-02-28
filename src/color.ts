import { Vec3 } from "./vec3";

const linearToGamma = (linearComponent: number) => {
  return linearComponent > 0 ? Math.sqrt(linearComponent) : 0;
};

const toByte = (m: number) => Math.floor(m * 255);

export function colorToRGBA(c: Vec3): [number, number, number, number] {
  return [
    toByte(linearToGamma(c.x)),
    toByte(linearToGamma(c.y)),
    toByte(linearToGamma(c.z)),
    255,
  ];
}

export function writeColor(
  ctx: CanvasRenderingContext2D,
  c: Vec3,
  j: number,
  i: number,
) {
  const r = linearToGamma(c.x);
  const g = linearToGamma(c.y);
  const b = linearToGamma(c.z);
  ctx.fillStyle = `rgb(${toByte(r)},${toByte(g)},${toByte(b)})`;
  ctx.fillRect(i, j, 1, 1);
}
