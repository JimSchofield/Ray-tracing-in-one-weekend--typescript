import { CameraState } from "./camera";
import { Sphere } from "./sphere";

// GPU sphere layout: 12 floats (3 x vec4f = 48 bytes)
// center_and_radius: vec4f  (xyz=center, w=radius)
// mat_type_and_params: vec4f (x=type, y=fuzz, z=refractionIndex, w=0)
// albedo: vec4f (xyz=albedo, w=0)
const FLOATS_PER_SPHERE = 12;

function materialTypeToU32(type: string): number {
  switch (type) {
    case "lambertian": return 0;
    case "metal": return 1;
    case "dielectric": return 2;
    default: return 0;
  }
}

export function packSpheres(world: Sphere[]): Float32Array {
  const data = new Float32Array(world.length * FLOATS_PER_SPHERE);

  for (let i = 0; i < world.length; i++) {
    const s = world[i];
    const off = i * FLOATS_PER_SPHERE;

    // center_and_radius
    data[off + 0] = s.center.x;
    data[off + 1] = s.center.y;
    data[off + 2] = s.center.z;
    data[off + 3] = s.radius;

    // mat_type_and_params
    const mat = s.material;
    data[off + 4] = materialTypeToU32(mat.type);
    data[off + 5] = mat.type === "metal" ? mat.fuzz : 0;
    data[off + 6] = mat.type === "dielectric" ? mat.refractionIndex : 0;
    data[off + 7] = 0;

    // albedo
    if (mat.type === "lambertian" || mat.type === "metal") {
      data[off + 8] = mat.albedo.x;
      data[off + 9] = mat.albedo.y;
      data[off + 10] = mat.albedo.z;
    } else {
      data[off + 8] = 1;
      data[off + 9] = 1;
      data[off + 10] = 1;
    }
    data[off + 11] = 0;
  }

  return data;
}

// Camera uniform layout: 128 bytes
// Offsets (in floats):
//  0-3:   pixel00Loc (vec4f, w=0)
//  4-7:   pixelDeltaU (vec4f, w=0)
//  8-11:  pixelDeltaV (vec4f, w=0)
// 12-15:  cameraCenter (vec4f, w=0)
// 16-19:  defocusDiskU (vec4f, w=0)
// 20-23:  defocusDiskV (vec4f, w=0)
// 24:     samplesPerPixel (u32)
// 25:     maxDepth (u32)
// 26:     defocusAngle (f32)
// 27:     width (u32)
// 28:     height (u32)
// 29:     startRow (u32)
// 30:     endRow (u32)
// 31:     rngSeed (u32)
export function packCameraUniforms(
  cam: CameraState,
  startRow: number,
  endRow: number,
  rngSeed: number,
): ArrayBuffer {
  const buf = new ArrayBuffer(128); // 32 floats * 4 bytes
  const f = new Float32Array(buf);
  const u = new Uint32Array(buf);

  // pixel00Loc
  f[0] = cam.pixel00Loc.x;
  f[1] = cam.pixel00Loc.y;
  f[2] = cam.pixel00Loc.z;
  f[3] = 0;

  // pixelDeltaU
  f[4] = cam.pixelDeltaU.x;
  f[5] = cam.pixelDeltaU.y;
  f[6] = cam.pixelDeltaU.z;
  f[7] = 0;

  // pixelDeltaV
  f[8] = cam.pixelDeltaV.x;
  f[9] = cam.pixelDeltaV.y;
  f[10] = cam.pixelDeltaV.z;
  f[11] = 0;

  // cameraCenter
  f[12] = cam.cameraCenter.x;
  f[13] = cam.cameraCenter.y;
  f[14] = cam.cameraCenter.z;
  f[15] = 0;

  // defocusDiskU
  f[16] = cam.defocusDiskU.x;
  f[17] = cam.defocusDiskU.y;
  f[18] = cam.defocusDiskU.z;
  f[19] = 0;

  // defocusDiskV
  f[20] = cam.defocusDiskV.x;
  f[21] = cam.defocusDiskV.y;
  f[22] = cam.defocusDiskV.z;
  f[23] = 0;

  // Scalar fields — u32 via Uint32Array view, f32 via Float32Array view
  u[24] = cam.config.samplesPerPixel;
  u[25] = cam.config.maxDepth;
  f[26] = cam.config.defocusAngle;
  u[27] = cam.config.width;
  u[28] = cam.config.height;
  u[29] = startRow;
  u[30] = endRow;
  u[31] = rngSeed;

  return buf;
}
