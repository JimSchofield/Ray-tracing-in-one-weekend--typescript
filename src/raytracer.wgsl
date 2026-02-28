// ----- Structs -----

struct GpuSphere {
  center_and_radius: vec4f,    // xyz=center, w=radius
  mat_type_and_params: vec4f,  // x=type(0=lamb,1=metal,2=diel), y=fuzz, z=refIdx
  albedo: vec4f,               // xyz=albedo
}

struct Camera {
  pixel00_loc:    vec4f,
  pixel_delta_u:  vec4f,
  pixel_delta_v:  vec4f,
  camera_center:  vec4f,
  defocus_disk_u: vec4f,
  defocus_disk_v: vec4f,
  samples_per_pixel: u32,
  max_depth:         u32,
  defocus_angle:     f32,
  width:             u32,
  height:            u32,
  start_row:         u32,
  end_row:           u32,
  rng_seed:          u32,
}

struct Ray {
  origin: vec3f,
  direction: vec3f,
}

struct HitRecord {
  p: vec3f,
  normal: vec3f,
  t: f32,
  front_face: bool,
  mat_type: u32,
  fuzz: f32,
  refraction_index: f32,
  albedo: vec3f,
}

// ----- Bindings -----

@group(0) @binding(0) var<uniform> cam: Camera;
@group(0) @binding(1) var<storage, read> spheres: array<GpuSphere>;
@group(0) @binding(2) var<storage, read_write> output: array<u32>;

// ----- PRNG (PCG) -----

var<private> rng_state: u32;

fn pcg_hash(input: u32) -> u32 {
  var state = input * 747796405u + 2891336453u;
  var word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

fn rng_init(pixel_x: u32, pixel_y: u32, frame_seed: u32) {
  rng_state = pcg_hash(pixel_x + pixel_y * 65536u + frame_seed * 16777259u);
}

fn rng_next() -> f32 {
  rng_state = pcg_hash(rng_state);
  return f32(rng_state) / 4294967295.0;
}

// ----- Vector helpers -----

fn vec3_near_zero(v: vec3f) -> bool {
  let s = 1e-8;
  return abs(v.x) < s && abs(v.y) < s && abs(v.z) < s;
}

fn vec3_reflect(v: vec3f, n: vec3f) -> vec3f {
  return v - 2.0 * dot(v, n) * n;
}

fn vec3_refract(uv: vec3f, n: vec3f, etai_over_etat: f32) -> vec3f {
  let cos_theta = min(dot(-uv, n), 1.0);
  let r_out_perp = etai_over_etat * (uv + cos_theta * n);
  let r_out_parallel = -sqrt(abs(1.0 - dot(r_out_perp, r_out_perp))) * n;
  return r_out_perp + r_out_parallel;
}

fn random_unit_vector() -> vec3f {
  for (var i = 0u; i < 100u; i++) {
    let p = vec3f(
      rng_next() * 2.0 - 1.0,
      rng_next() * 2.0 - 1.0,
      rng_next() * 2.0 - 1.0,
    );
    let ls = dot(p, p);
    if ls > 1e-10 && ls <= 1.0 {
      return p / sqrt(ls);
    }
  }
  return vec3f(0.0, 1.0, 0.0); // fallback
}

fn random_in_unit_disk() -> vec2f {
  for (var i = 0u; i < 100u; i++) {
    let p = vec2f(
      rng_next() * 2.0 - 1.0,
      rng_next() * 2.0 - 1.0,
    );
    if dot(p, p) < 1.0 {
      return p;
    }
  }
  return vec2f(0.0, 0.0); // fallback
}

// ----- Sphere intersection -----

fn sphere_hit(s: GpuSphere, r: Ray, t_min: f32, t_max: f32, rec: ptr<function, HitRecord>) -> bool {
  let center = s.center_and_radius.xyz;
  let radius = s.center_and_radius.w;

  let oc = center - r.origin;
  let a = dot(r.direction, r.direction);
  let h = dot(r.direction, oc);
  let c = dot(oc, oc) - radius * radius;
  let discriminant = h * h - a * c;

  if discriminant < 0.0 {
    return false;
  }

  let sqrtd = sqrt(discriminant);
  var root = (h - sqrtd) / a;
  if root <= t_min || root >= t_max {
    root = (h + sqrtd) / a;
    if root <= t_min || root >= t_max {
      return false;
    }
  }

  let p = r.origin + root * r.direction;
  let outward_normal = (p - center) / radius;
  let front_face = dot(r.direction, outward_normal) < 0.0;
  let normal = select(-outward_normal, outward_normal, front_face);

  (*rec).t = root;
  (*rec).p = p;
  (*rec).normal = normal;
  (*rec).front_face = front_face;
  (*rec).mat_type = u32(s.mat_type_and_params.x);
  (*rec).fuzz = s.mat_type_and_params.y;
  (*rec).refraction_index = s.mat_type_and_params.z;
  (*rec).albedo = s.albedo.xyz;

  return true;
}

// ----- World hit -----

fn world_hit(r: Ray, t_min: f32, t_max: f32, rec: ptr<function, HitRecord>) -> bool {
  var hit_anything = false;
  var closest_so_far = t_max;
  var temp_rec: HitRecord;

  let count = arrayLength(&spheres);
  for (var i = 0u; i < count; i++) {
    if sphere_hit(spheres[i], r, t_min, closest_so_far, &temp_rec) {
      hit_anything = true;
      closest_so_far = temp_rec.t;
      *rec = temp_rec;
    }
  }

  return hit_anything;
}

// ----- Material scattering -----

fn reflectance(cosine: f32, refraction_index: f32) -> f32 {
  var r0 = (1.0 - refraction_index) / (1.0 + refraction_index);
  r0 = r0 * r0;
  return r0 + (1.0 - r0) * pow(1.0 - cosine, 5.0);
}

struct ScatterResult {
  did_scatter: bool,
  scattered: Ray,
  attenuation: vec3f,
}

fn scatter_material(rec: HitRecord, ray_in: Ray) -> ScatterResult {
  var result: ScatterResult;

  switch rec.mat_type {
    case 0u: { // lambertian
      var scatter_dir = rec.normal + random_unit_vector();
      if vec3_near_zero(scatter_dir) {
        scatter_dir = rec.normal;
      }
      result.did_scatter = true;
      result.scattered = Ray(rec.p, scatter_dir);
      result.attenuation = rec.albedo;
    }
    case 1u: { // metal
      var reflected = vec3_reflect(ray_in.direction, rec.normal);
      reflected = normalize(reflected) + rec.fuzz * random_unit_vector();
      result.scattered = Ray(rec.p, reflected);
      result.attenuation = rec.albedo;
      result.did_scatter = dot(reflected, rec.normal) > 0.0;
    }
    case 2u: { // dielectric
      result.attenuation = vec3f(1.0, 1.0, 1.0);
      var ri: f32;
      if rec.front_face {
        ri = 1.0 / rec.refraction_index;
      } else {
        ri = rec.refraction_index;
      }
      let unit_dir = normalize(ray_in.direction);
      let cos_theta = min(dot(-unit_dir, rec.normal), 1.0);
      let sin_theta = sqrt(1.0 - cos_theta * cos_theta);
      let cannot_refract = ri * sin_theta > 1.0;

      var direction: vec3f;
      if cannot_refract || reflectance(cos_theta, ri) > rng_next() {
        direction = vec3_reflect(unit_dir, rec.normal);
      } else {
        direction = vec3_refract(unit_dir, rec.normal, ri);
      }

      result.did_scatter = true;
      result.scattered = Ray(rec.p, direction);
    }
    default: {
      result.did_scatter = false;
    }
  }

  return result;
}

// ----- Ray color (iterative) -----

fn ray_color(initial_ray: Ray) -> vec3f {
  var current_ray = initial_ray;
  var accumulated_attenuation = vec3f(1.0, 1.0, 1.0);
  var rec: HitRecord;

  for (var depth = 0u; depth < cam.max_depth; depth++) {
    if world_hit(current_ray, 0.0001, 1e30, &rec) {
      let result = scatter_material(rec, current_ray);
      if result.did_scatter {
        accumulated_attenuation *= result.attenuation;
        current_ray = result.scattered;
      } else {
        return vec3f(0.0, 0.0, 0.0);
      }
    } else {
      // Sky
      let unit_dir = normalize(current_ray.direction);
      let a = 0.5 * (unit_dir.y + 1.0);
      let sky = (1.0 - a) * vec3f(1.0, 1.0, 1.0) + a * vec3f(0.5, 0.7, 1.0);
      return accumulated_attenuation * sky;
    }
  }

  // Exceeded max depth
  return vec3f(0.0, 0.0, 0.0);
}

// ----- Get ray -----

fn get_ray(i: f32, j: f32) -> Ray {
  let offset_x = rng_next() - 0.5;
  let offset_y = rng_next() - 0.5;

  let pixel_sample = cam.pixel00_loc.xyz
    + (i + offset_x) * cam.pixel_delta_u.xyz
    + (j + offset_y) * cam.pixel_delta_v.xyz;

  var ray_origin: vec3f;
  if cam.defocus_angle <= 0.0 {
    ray_origin = cam.camera_center.xyz;
  } else {
    let disk = random_in_unit_disk();
    ray_origin = cam.camera_center.xyz
      + disk.x * cam.defocus_disk_u.xyz
      + disk.y * cam.defocus_disk_v.xyz;
  }

  let ray_direction = pixel_sample - ray_origin;
  return Ray(ray_origin, ray_direction);
}

// ----- Entry point -----

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let x = gid.x;
  let y = gid.y + cam.start_row;

  if x >= cam.width || y >= cam.end_row {
    return;
  }

  rng_init(x, y, cam.rng_seed);

  var pixel_color = vec3f(0.0, 0.0, 0.0);
  for (var s = 0u; s < cam.samples_per_pixel; s++) {
    let r = get_ray(f32(x), f32(y));
    pixel_color += ray_color(r);
  }

  pixel_color /= f32(cam.samples_per_pixel);

  // Gamma correction (sqrt)
  let corrected = sqrt(max(pixel_color, vec3f(0.0)));

  let r = u32(clamp(corrected.x * 255.0, 0.0, 255.0));
  let g = u32(clamp(corrected.y * 255.0, 0.0, 255.0));
  let b = u32(clamp(corrected.z * 255.0, 0.0, 255.0));
  let a = 255u;

  // Pack as RGBA u32 (little-endian: R in lowest byte)
  let packed = r | (g << 8u) | (b << 16u) | (a << 24u);

  let band_y = y - cam.start_row;
  let idx = band_y * cam.width + x;
  output[idx] = packed;
}
