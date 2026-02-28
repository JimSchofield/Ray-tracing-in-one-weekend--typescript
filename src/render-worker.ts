import { getRay, rayColor } from "./camera";
import { colorToRGBA } from "./color";
import { vec3, vecAdd, vecK } from "./vec3";
import { RenderWorkerInput, RenderWorkerOutput } from "./worker-types";

self.onmessage = (e: MessageEvent<RenderWorkerInput>) => {
  const { camState, world, startRow, endRow } = e.data;
  const { config } = camState;
  const width = config.width;
  const bandHeight = endRow - startRow;
  const pixels = new Uint8ClampedArray(bandHeight * width * 4);

  for (let j = startRow; j < endRow; j++) {
    for (let i = 0; i < width; i++) {
      let pixelColor = vec3(0, 0, 0);

      for (let sample = 0; sample < config.samplesPerPixel; sample++) {
        const r = getRay(camState, i, j);
        pixelColor = vecAdd(pixelColor, rayColor(r, config.maxDepth, world));
      }

      const scaled = vecK(pixelColor, camState.pixelSamplesScale);
      const [cr, cg, cb, ca] = colorToRGBA(scaled);

      const idx = ((j - startRow) * width + i) * 4;
      pixels[idx] = cr;
      pixels[idx + 1] = cg;
      pixels[idx + 2] = cb;
      pixels[idx + 3] = ca;
    }
  }

  const result: RenderWorkerOutput = { startRow, endRow, pixels };
  self.postMessage(result, [pixels.buffer] as never);
};
