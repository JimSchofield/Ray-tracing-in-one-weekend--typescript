import { packCameraUniforms, packSpheres } from "./gpu-buffer-utils";
import shaderSource from "./raytracer.wgsl?raw";
import { GpuRenderWorkerInput } from "./worker-types";

self.onmessage = async (e: MessageEvent<GpuRenderWorkerInput>) => {
  const { camState, world, startRow, endRow, rngSeed } = e.data;
  const width = camState.config.width;
  const bandHeight = endRow - startRow;

  // Feature detect WebGPU
  if (!navigator.gpu) {
    self.postMessage({ error: "WebGPU not available", startRow, endRow });
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    self.postMessage({ error: "No GPU adapter", startRow, endRow });
    return;
  }

  const device = await adapter.requestDevice({
    requiredLimits: {
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxBufferSize: adapter.limits.maxBufferSize,
      maxComputeWorkgroupsPerDimension: adapter.limits.maxComputeWorkgroupsPerDimension,
    },
  });

  device.lost.then((info) => {
    console.error(`GPU device lost: ${info.reason}`, info.message);
  });

  // Pack data
  const sphereData = packSpheres(world);
  const cameraData = packCameraUniforms(camState, startRow, endRow, rngSeed);

  // Create buffers
  const cameraBuffer = device.createBuffer({
    size: cameraData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(cameraBuffer, 0, cameraData);

  const sphereBuffer = device.createBuffer({
    size: sphereData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(sphereBuffer, 0, sphereData);

  const outputSize = width * bandHeight * 4; // u32 per pixel
  const outputBuffer = device.createBuffer({
    size: outputSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const readbackBuffer = device.createBuffer({
    size: outputSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  // Create pipeline
  const shaderModule = device.createShaderModule({ code: shaderSource });
  const compilationInfo = await shaderModule.getCompilationInfo();
  for (const msg of compilationInfo.messages) {
    if (msg.type === "error") {
      console.error(`Shader error: ${msg.message} at line ${msg.lineNum}`);
    } else {
      console.warn(`Shader ${msg.type}: ${msg.message} at line ${msg.lineNum}`);
    }
  }
  const pipeline = await device.createComputePipelineAsync({
    layout: "auto",
    compute: {
      module: shaderModule,
      entryPoint: "main",
    },
  });

  // Create bind group
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: cameraBuffer } },
      { binding: 1, resource: { buffer: sphereBuffer } },
      { binding: 2, resource: { buffer: outputBuffer } },
    ],
  });

  // Dispatch
  const workgroupsX = Math.ceil(width / 16);
  const workgroupsY = Math.ceil(bandHeight / 16);

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(workgroupsX, workgroupsY);
  pass.end();

  // Copy output to readback
  encoder.copyBufferToBuffer(outputBuffer, 0, readbackBuffer, 0, outputSize);
  device.queue.submit([encoder.finish()]);

  // Read back
  await readbackBuffer.mapAsync(GPUMapMode.READ);
  const resultData = new Uint8ClampedArray(readbackBuffer.getMappedRange().slice(0));
  readbackBuffer.unmap();

  // Clean up
  cameraBuffer.destroy();
  sphereBuffer.destroy();
  outputBuffer.destroy();
  readbackBuffer.destroy();
  device.destroy();

  // Post result back
  self.postMessage(
    { startRow, endRow, pixels: resultData },
    [resultData.buffer] as never,
  );
};
