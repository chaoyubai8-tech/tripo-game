/**
 * Parses GPT-5.5 / Claude / Codex-style Three.js game code and
 * extracts the 3D objects that can be upgraded with Tripo.
 *
 * We intentionally use regex instead of a JS AST because:
 *   1. AI-generated games are usually a single <script> inside an HTML
 *      file, and often contain type hints, JSX-like syntax or light
 *      TypeScript that AST parsers choke on.
 *   2. We only need to recognise a well-known set of idioms (new THREE.Mesh(
 *      new THREE.XxxGeometry(...), new THREE.MeshStandardMaterial(...))).
 *   3. Regex is fast and easy to extend when we see new patterns in the wild.
 *
 * If a more structural approach is ever needed, @babel/parser + traverse
 * can be plugged in behind this same interface.
 */

import type { DetectedObject } from "../types.js";

/** Raw match emitted by the regex scan. */
interface RawMatch {
  variableName: string;
  geometry: string;
  geometryArgs: string;
  materialChunk: string;
  fullMatch: string;
  index: number;
}

/**
 * Pattern examples we want to catch (all on a single line or split over a
 * few):
 *
 *   const tank = new THREE.Mesh(new THREE.BoxGeometry(1,0.5,2), tankMat);
 *   let ufo = new THREE.Mesh(new THREE.CylinderGeometry(1,2,0.3,16), ufoMat);
 *   const rock = new THREE.Mesh(new THREE.SphereGeometry(0.5), rockMat);
 *   const turret = new THREE.Mesh(
 *       new THREE.BoxGeometry(0.3, 0.3, 1.2),
 *       new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
 *   );
 */
const MESH_PATTERN =
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+THREE\.Mesh\s*\(\s*new\s+THREE\.([A-Z][A-Za-z0-9]*Geometry)\s*\(([^)]*)\)\s*,\s*([\s\S]*?)\)\s*;/g;

/** Known "background" / "decoration" geometries we never upgrade. */
const SKIP_GEOMETRIES = new Set([
  "PlaneGeometry", // ground plane – keep as-is
  "BufferGeometry", // generic custom meshes we can't easily describe
]);

/** Options for filtering which meshes get picked up by detectThreeObjects. */
export interface DetectOptions {
  /**
   * If provided, only variable names on this list are kept (after the default
   * geometry filter). Matching is case-sensitive and exact.
   *
   * Example: `--only ufo,rock,pineTree` → only those three become upgrade jobs.
   */
  only?: string[];
  /**
   * If provided, variable names on this list are always dropped, even if they
   * would otherwise match. Handy for shells / bombs / particles that are
   * spawned at runtime and don't benefit from a Tripo asset.
   *
   * Example: `--skip shell,bomb,tank,turret`.
   */
  skip?: string[];
}

/**
 * Scan source code and return the list of 3D objects that can be upgraded.
 */
export function detectThreeObjects(
  source: string,
  options: DetectOptions = {},
): DetectedObject[] {
  const matches = collectRawMatches(source);
  const onlySet = options.only && options.only.length > 0 ? new Set(options.only) : null;
  const skipSet = options.skip && options.skip.length > 0 ? new Set(options.skip) : null;
  const objects: DetectedObject[] = [];

  for (const raw of matches) {
    if (SKIP_GEOMETRIES.has(raw.geometry)) continue;
    if (skipSet && skipSet.has(raw.variableName)) continue;
    if (onlySet && !onlySet.has(raw.variableName)) continue;

    const prompt = buildPrompt(raw.variableName, raw.geometry, raw.materialChunk);
    const scaleHint = parseScaleHint(raw.geometry, raw.geometryArgs);

    objects.push({
      id: `${raw.variableName}-${objects.length + 1}`,
      variableName: raw.variableName,
      prompt,
      originalGeometry: raw.geometry,
      sourceSnippet: raw.fullMatch,
      scaleHint,
    });
  }

  return dedupeByPrompt(objects);
}

function collectRawMatches(source: string): RawMatch[] {
  const out: RawMatch[] = [];
  for (const m of source.matchAll(MESH_PATTERN)) {
    out.push({
      variableName: m[1],
      geometry: m[2],
      geometryArgs: m[3],
      materialChunk: m[4],
      fullMatch: m[0],
      index: m.index ?? 0,
    });
  }
  return out;
}

/**
 * Turn a variable name + geometry + material blob into a Tripo-friendly
 * English prompt. This is heuristic but good enough for 90% of cases and it
 * can always be overridden from the CLI / a Skill.
 */
export function buildPrompt(
  variableName: string,
  geometry: string,
  materialChunk: string,
): string {
  const readableName = humanise(variableName);
  const color = extractColor(materialChunk);
  const shapeHint = geometryToHint(geometry);

  const parts = [
    readableName,
    color ? ` (${color})` : "",
    shapeHint ? `, ${shapeHint}` : "",
    ", highly detailed 3D game asset, realistic PBR textures, intricate surface details, dramatic lighting baked in, centered, facing forward, AAA game quality",
  ].filter(Boolean);

  return parts.join("").replace(/\s+/g, " ").trim();

}

/**
 * Convert a camelCase / snake_case variable name into a natural English
 * noun phrase. `ufoShip` → "ufo ship", `tank_turret_01` → "tank turret".
 */
export function humanise(name: string): string {
  return name
    .replace(/[_\-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\d+$/g, "")
    .trim()
    .toLowerCase();
}

function extractColor(materialChunk: string): string | null {
  // Support `color: 0xff5533` and `color: '#ff5533'` and `color: 'red'`.
  const hex = /color\s*:\s*0x([0-9a-fA-F]{3,6})/.exec(materialChunk);
  if (hex) return `hex #${hex[1]}`;
  const hash = /color\s*:\s*["'`]#?([0-9a-fA-F]{3,6})["'`]/.exec(materialChunk);
  if (hash) return `hex #${hash[1]}`;
  const named = /color\s*:\s*["'`]([a-zA-Z]+)["'`]/.exec(materialChunk);
  if (named) return named[1];
  return null;
}

function geometryToHint(geometry: string): string {
  const mapping: Record<string, string> = {
    BoxGeometry: "boxy silhouette",
    SphereGeometry: "rounded spherical shape",
    CylinderGeometry: "cylindrical body",
    ConeGeometry: "conical/pointed top",
    TorusGeometry: "ring-shaped",
    CapsuleGeometry: "capsule-shaped",
    TetrahedronGeometry: "angular faceted shape",
    IcosahedronGeometry: "faceted crystal-like shape",
  };
  return mapping[geometry] ?? "";
}

/** Pull the first three positional args out of a geometry constructor. */
function parseScaleHint(
  geometry: string,
  args: string,
): { x: number; y: number; z: number } | undefined {
  const nums = args
    .split(",")
    .map((s) => Number.parseFloat(s.trim()))
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) return undefined;

  switch (geometry) {
    case "BoxGeometry":
      return { x: nums[0] ?? 1, y: nums[1] ?? 1, z: nums[2] ?? 1 };
    case "SphereGeometry": {
      const r = nums[0] ?? 0.5;
      return { x: r * 2, y: r * 2, z: r * 2 };
    }
    case "CylinderGeometry":
    case "ConeGeometry":
    case "CapsuleGeometry": {
      const r = Math.max(nums[0] ?? 0.5, nums[1] ?? 0.5);
      const h = nums[2] ?? 1;
      return { x: r * 2, y: h, z: r * 2 };
    }
    default:
      return undefined;
  }
}

/**
 * If two meshes would produce the exact same prompt, collapse them: generate
 * the model once and reuse the resulting GLB for every instance.
 */
function dedupeByPrompt(objects: DetectedObject[]): DetectedObject[] {
  const seen = new Map<string, DetectedObject>();
  for (const obj of objects) {
    const key = obj.prompt.toLowerCase();
    if (!seen.has(key)) seen.set(key, obj);
  }
  return Array.from(seen.values());
}
