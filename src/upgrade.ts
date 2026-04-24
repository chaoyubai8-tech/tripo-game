/**
 * Top-level orchestrator: read an HTML game, detect 3D objects,
 * run them through Tripo, and write the upgraded HTML.
 *
 * This module is pure: it does not print anything on its own; the CLI
 * layer drives the UX. All side effects are isolated here.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { detectThreeObjects } from "./parsers/threeParser.js";
import { transformHtml } from "./transformers/htmlTransformer.js";
import { TripoClient } from "./services/tripo.js";
import type {
  DetectedObject,
  GeneratedAsset,
  UpgradeOptions,
} from "./types.js";

export interface UpgradeHooks {
  onObjectsDetected?: (objects: DetectedObject[]) => void;
  onAssetStart?: (object: DetectedObject) => void;
  onAssetProgress?: (object: DetectedObject, progress: number) => void;
  onAssetDone?: (asset: GeneratedAsset) => void;
  onAssetFailed?: (object: DetectedObject, err: unknown) => void;
}

export interface UpgradeResult {
  input: string;
  output: string;
  detected: DetectedObject[];
  generated: GeneratedAsset[];
  failed: Array<{ object: DetectedObject; error: string }>;
}

export async function upgradeGame(
  options: UpgradeOptions,
  hooks: UpgradeHooks = {},
): Promise<UpgradeResult> {
  const inputAbs = path.resolve(options.input);
  const outputAbs = path.resolve(options.output);
  const assetsDirAbs = path.resolve(options.assetsDir);
  const assetsRelDir = toRelativePosix(path.dirname(outputAbs), assetsDirAbs);

  const html = await readFile(inputAbs, "utf8");
  const detected = detectThreeObjects(html, {
    only: options.only,
    skip: options.skip,
  });
  hooks.onObjectsDetected?.(detected);

  // `--only` already narrowed the list, so `--max` just clamps whatever
  // survived the include/exclude filters.
  const limited = options.maxObjects
    ? detected.slice(0, options.maxObjects)
    : detected;


  if (options.dryRun) {
    return {
      input: inputAbs,
      output: outputAbs,
      detected,
      generated: [],
      failed: [],
    };
  }

  // Real run: we need a Tripo key.
  const apiKey = options.apiKey ?? process.env.TRIPO_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing Tripo API key. Set TRIPO_API_KEY env var or pass --api-key.",
    );
  }

  const client = new TripoClient({ apiKey });
  await mkdir(assetsDirAbs, { recursive: true });

  const generated: GeneratedAsset[] = [];
  const failed: Array<{ object: DetectedObject; error: string }> = [];

  // Generate sequentially; after each success immediately rewrite the output
  // HTML so the browser can show the new model without waiting for the rest.
  await mkdir(path.dirname(outputAbs), { recursive: true });

  for (const obj of limited) {
    hooks.onAssetStart?.(obj);
    try {
      const fileName = `${slug(obj.variableName)}-${obj.id}.glb`;
      const result = await client.textToModel(
        { prompt: obj.prompt, quality: options.quality ?? "standard" },
        assetsDirAbs,
        fileName,
        (status) => {
          if (typeof status.progress === "number") {
            hooks.onAssetProgress?.(obj, status.progress);
          }
        },
      );
      const asset: GeneratedAsset = {
        object: obj,
        modelPath: result.modelPath,
        remoteUrl: result.remoteUrl,
        taskId: result.taskId,
      };
      generated.push(asset);
      hooks.onAssetDone?.(asset);

      // ✨ Incremental write: update the output HTML after every successful asset
      // so the browser immediately shows the new model when refreshed.
      const { html: upgraded, manifestJson } = transformHtml(
        html,
        generated,
        assetsRelDir,
      );
      await writeFile(outputAbs, upgraded, "utf8");
      await writeFile(path.join(assetsDirAbs, "manifest.json"), manifestJson, "utf8");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed.push({ object: obj, error: msg });
      hooks.onAssetFailed?.(obj, err);
    }
  }

  // Final write (covers the case where all failed — still writes a valid HTML).
  const { html: finalHtml, manifestJson: finalManifest } = transformHtml(
    html,
    generated,
    assetsRelDir,
  );
  await writeFile(outputAbs, finalHtml, "utf8");
  await writeFile(path.join(assetsDirAbs, "manifest.json"), finalManifest, "utf8");


  return {
    input: inputAbs,
    output: outputAbs,
    detected,
    generated,
    failed,
  };
}

function toRelativePosix(from: string, to: string): string {
  const rel = path.relative(from, to) || ".";
  return rel.split(path.sep).join("/");
}

function slug(input: string): string {
  return input
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40) || "asset";
}
