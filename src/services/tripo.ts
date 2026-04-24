/**
 * Tripo 3D API client.
 *
 * Docs: https://platform.tripo3d.ai/docs
 *
 * We only depend on the public v2 openapi endpoints:
 *   POST /v2/openapi/task            – submit a task (text_to_model, image_to_model, ...)
 *   GET  /v2/openapi/task/:id        – poll the task status
 *
 * The client is deliberately minimal: no SDK, just `fetch`.
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { TripoTaskResponse, TripoTaskStatus } from "../types.js";

const DEFAULT_BASE = "https://api.tripo3d.ai";

export interface TripoClientOptions {
  apiKey: string;
  baseUrl?: string;
  /** How often to poll the task status, in ms. */
  pollIntervalMs?: number;
  /** Maximum time to wait for a single task, in ms. */
  timeoutMs?: number;
}

export interface TextToModelParams {
  prompt: string;
  /** `high` = quality tier, `standard` = faster/cheaper. */
  quality?: "draft" | "standard" | "high";
  /** Tripo model version, defaults to the latest text-to-model model. */
  modelVersion?: string;
  /** Optional style hint (e.g. "cartoon", "realistic"). */
  style?: string;
}

export class TripoClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly pollIntervalMs: number;
  private readonly timeoutMs: number;

  constructor(options: TripoClientOptions) {
    if (!options.apiKey) {
      throw new Error(
        "Tripo API key is required. Set TRIPO_API_KEY env var or pass --api-key.",
      );
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
    this.pollIntervalMs = options.pollIntervalMs ?? 4000;
    this.timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
  }

  /** Submit a text-to-model task and resolve with the task id. */
  async submitTextToModel(params: TextToModelParams): Promise<string> {
    const body = {
      type: "text_to_model",
      model_version: params.modelVersion ?? "v2.5-20250123",
      prompt: params.prompt,
      texture: true,
      pbr: true,
      face_limit: params.quality === "draft" ? 10_000 : 30_000,
      auto_size: true,
      style: params.style,
    };

    const res = await fetch(`${this.baseUrl}/v2/openapi/task`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Tripo submit failed (${res.status} ${res.statusText}): ${text}`,
      );
    }

    const json = (await res.json()) as TripoTaskResponse;
    if (json.code !== 0 || !json.data?.task_id) {
      throw new Error(`Tripo submit returned unexpected payload: ${JSON.stringify(json)}`);
    }
    return json.data.task_id;
  }

  /** Poll a task until it completes (success / failed / timeout). */
  async waitForTask(
    taskId: string,
    onProgress?: (status: TripoTaskStatus["data"]) => void,
  ): Promise<TripoTaskStatus["data"]> {
    const start = Date.now();
    // Exponential-ish backoff with a cap.
    let delay = this.pollIntervalMs;

    while (Date.now() - start < this.timeoutMs) {
      const res = await fetch(`${this.baseUrl}/v2/openapi/task/${taskId}`, {
        headers: { authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Tripo status failed (${res.status}): ${text}`,
        );
      }
      const json = (await res.json()) as TripoTaskStatus;
      const data = json.data;
      onProgress?.(data);

      if (data.status === "success") return data;
      if (data.status === "failed" || data.status === "cancelled") {
        throw new Error(`Tripo task ${taskId} ended with status ${data.status}`);
      }

      await sleep(delay);
      delay = Math.min(delay + 1000, 12_000);
    }

    throw new Error(`Tripo task ${taskId} timed out after ${this.timeoutMs}ms`);
  }

  /**
   * End-to-end helper: submit a text-to-model task, wait for it, and download
   * the resulting GLB into `outDir`. Returns absolute path + the remote URL.
   */
  async textToModel(
    params: TextToModelParams,
    outDir: string,
    fileName: string,
    onProgress?: (status: TripoTaskStatus["data"]) => void,
  ): Promise<{ modelPath: string; remoteUrl: string; taskId: string }> {
    const taskId = await this.submitTextToModel(params);
    const status = await this.waitForTask(taskId, onProgress);

    const remoteUrl = status.output?.pbr_model ?? status.output?.model;
    if (!remoteUrl) {
      throw new Error(
        `Tripo task ${taskId} completed but returned no model URL: ${JSON.stringify(status.output)}`,
      );
    }

    await mkdir(outDir, { recursive: true });
    const modelPath = path.join(outDir, fileName.endsWith(".glb") ? fileName : `${fileName}.glb`);
    await downloadTo(remoteUrl, modelPath);
    return { modelPath, remoteUrl, taskId };
  }
}

async function downloadTo(url: string, filePath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(filePath, buf);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
