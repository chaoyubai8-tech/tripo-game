/**
 * Rewrites an AI-generated Three.js HTML file to replace simple geometries
 * with GLB models downloaded from Tripo.
 *
 * Strategy (designed to be safe & reversible):
 *   1. Keep the original <script> untouched.
 *   2. Inject a *new* <script type="module"> right after the main script that
 *      - imports GLTFLoader
 *      - defines `window.__TRIPO_ASSETS__` with { [variableName]: "./assets/xxx.glb" }
 *      - exposes a helper `tripoUpgrade(mesh, assetPath, scaleHint)` that
 *        replaces the mesh's geometry/material with the loaded GLB scene
 *        while preserving position / rotation / userData.
 *      - waits for window.onload, iterates known variables (via a manifest
 *        we write), calls the helper.
 *   3. Because the original script still creates the low-poly mesh first, the
 *      game keeps working even before the GLB is loaded. We only swap the
 *      visual once Tripo assets arrive — gameplay, collisions, animations
 *      keep referencing the original mesh object.
 *
 * This is a deliberate choice: we do NOT parse/edit the original script
 * (which is fragile with AI-generated code). Instead we overlay Tripo on
 * top, which is both safer and more spectacular in demos.
 */

import path from "node:path";
import type { GeneratedAsset } from "../types.js";

export interface TransformResult {
  html: string;
  manifestJson: string;
}

/**
 * Given the original HTML source and the list of downloaded Tripo assets,
 * return the new HTML string with the upgrade overlay injected.
 */
export function transformHtml(
  html: string,
  assets: GeneratedAsset[],
  assetsRelDir: string,
): TransformResult {
  const manifest = buildManifest(assets, assetsRelDir);
  const overlay = buildOverlayScript(manifest);
  const manifestJson = JSON.stringify(manifest, null, 2);

  if (html.includes("</body>")) {
    return {
      html: html.replace("</body>", `${overlay}\n</body>`),
      manifestJson,
    };
  }
  // Fallback: append at the end.
  return { html: `${html}\n${overlay}\n`, manifestJson };
}

interface ManifestEntry {
  variableName: string;
  asset: string;
  scale?: { x: number; y: number; z: number };
}

function buildManifest(
  assets: GeneratedAsset[],
  assetsRelDir: string,
): ManifestEntry[] {
  return assets.map((a) => ({
    variableName: a.object.variableName,
    asset: toPosix(path.join(assetsRelDir, path.basename(a.modelPath))),
    scale: a.object.scaleHint,
  }));
}

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

/**
 * The overlay script. It is intentionally framework-free so it works in the
 * minimal Three.js setups that GPT-5.5 / Codex generate.
 *
 * Requires that the host page already loaded `three` as a global `THREE` or
 * as an ESM import. We lazily import GLTFLoader from the Three examples CDN,
 * which is the exact same pattern GPT-5.5 uses for loaders.
 */
function buildOverlayScript(manifest: ManifestEntry[]): string {
  const manifestLiteral = JSON.stringify(manifest, null, 2);
  // Derive the manifest.json path from the first asset path (same directory).
  const manifestPath = manifest.length > 0
    ? manifest[0].asset.replace(/\/[^/]+$/, "/manifest.json")
    : "./assets/manifest.json";

  return `
<!-- ⬇️ tripo-game upgrade overlay -->
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
  }
}
</script>
<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Initial manifest baked in at generation time.
let TRIPO_MANIFEST = ${manifestLiteral};
window.__TRIPO_ASSETS__ = TRIPO_MANIFEST;

const MANIFEST_URL = "${manifestPath}";
const loader = new GLTFLoader();
const upgraded = new Set();

/**
 * Replace the geometry of \`mesh\` with the loaded GLB scene.
 * Keeps position, rotation, parent & userData so gameplay logic still works.
 */
function swapMesh(mesh, glbUrl, scaleHint) {
  loader.load(
    glbUrl,
    (gltf) => {
      const model = gltf.scene;

      // Compute target size: use scaleHint if provided, else original mesh bbox.
      const srcBox = new THREE.Box3().setFromObject(mesh);
      const srcSize = srcBox.getSize(new THREE.Vector3());
      const targetX = scaleHint ? scaleHint.x : srcSize.x;
      const targetY = scaleHint ? scaleHint.y : srcSize.y;
      const targetZ = scaleHint ? scaleHint.z : srcSize.z;

      const dstBox = new THREE.Box3().setFromObject(model);
      const dstSize = dstBox.getSize(new THREE.Vector3());

      // Use Math.max (not min) so the model fills the space generously —
      // makes the visual upgrade much more dramatic and noticeable.
      // Then apply a 1.4× "wow factor" multiplier so it's clearly bigger.
      const scale = Math.max(
        targetX / Math.max(dstSize.x, 0.001),
        targetY / Math.max(dstSize.y, 0.001),
        targetZ / Math.max(dstSize.z, 0.001),
      ) * 1.4;

      model.scale.setScalar(scale);

      // Center the model on the mesh's local origin.
      const centeredBox = new THREE.Box3().setFromObject(model);
      const center = centeredBox.getCenter(new THREE.Vector3());
      model.position.sub(center);
      model.position.y += (centeredBox.max.y - centeredBox.min.y) * 0.5;

      // Enable shadows on all sub-meshes.
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      mesh.geometry?.dispose?.();
      if (mesh.material?.dispose) mesh.material.dispose();
      mesh.geometry = new THREE.BufferGeometry();
      mesh.material = new THREE.MeshBasicMaterial({ visible: false });
      mesh.add(model);
      mesh.userData.tripoUpgraded = true;
      console.log(\`[tripo-game] ✅ swapped \${mesh.userData.tripoVarName} (scale=\${scale.toFixed(2)})\`);
    },
    undefined,
    (err) => console.warn("[tripo-game] failed to load", glbUrl, err),
  );
}


function applyManifest(entries) {
  for (const entry of entries) {
    const target = window[entry.variableName];
    if (!target) continue;
    if (target.userData.tripoUpgraded) continue;
    if (target.userData.tripoPending) continue;
    target.userData.tripoVarName = entry.variableName;
    target.userData.tripoPending = true;
    swapMesh(target, entry.asset, entry.scale);
  }
}

// Poll manifest.json every 4 s so new assets appear in the browser
// automatically as the CLI generates them — no page refresh needed.
async function pollManifest() {
  try {
    const res = await fetch(MANIFEST_URL + "?t=" + Date.now());
    if (!res.ok) return;
    const fresh = await res.json();
    if (fresh.length > TRIPO_MANIFEST.length) {
      console.log(\`[tripo-game] manifest updated: \${fresh.length} assets\`);
      TRIPO_MANIFEST = fresh;
      window.__TRIPO_ASSETS__ = fresh;
      applyManifest(fresh);
    }
  } catch (_) { /* offline / file:// — ignore */ }
}

window.addEventListener("load", () => {
  // Initial pass for already-baked assets.
  let attempts = 0;
  const initTimer = setInterval(() => {
    applyManifest(TRIPO_MANIFEST);
    attempts++;
    if (attempts > 20) clearInterval(initTimer);
  }, 500);

  // Live-reload: keep polling while CLI is still running.
  const pollTimer = setInterval(async () => {
    await pollManifest();
  }, 4000);

  // Stop polling after 20 minutes (CLI should be done by then).
  setTimeout(() => clearInterval(pollTimer), 20 * 60 * 1000);
});
</script>
<!-- ⬆️ tripo-game upgrade overlay -->
`;
}

