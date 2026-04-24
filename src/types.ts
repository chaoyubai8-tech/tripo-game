/**
 * Core types shared across tripo-game.
 */

/** A 3D object detected inside an AI-generated Three.js game. */
export interface DetectedObject {
  /** Stable id used to key the generated asset. */
  id: string;
  /** Variable name the object is assigned to in source code (e.g. `tank`, `ufo1`). */
  variableName: string;
  /** A short, Tripo-friendly English prompt describing the asset. */
  prompt: string;
  /** Original Three.js geometry type (BoxGeometry, SphereGeometry, ...). */
  originalGeometry: string;
  /** Approximate source-code location (for rewriting). */
  sourceSnippet: string;
  /** Optional scale hint extracted from source (used to normalise the replacement mesh). */
  scaleHint?: { x: number; y: number; z: number };
}

/** The result of a successful Tripo generation. */
export interface GeneratedAsset {
  /** The object this asset belongs to. */
  object: DetectedObject;
  /** Local path where the GLB model has been stored. */
  modelPath: string;
  /** Public-ish URL returned by Tripo (kept for debugging). */
  remoteUrl: string;
  /** Task id returned by Tripo (useful for resume). */
  taskId: string;
}

/** CLI options passed to the `upgrade` command. */
export interface UpgradeOptions {
  /** Path to the input HTML game file. */
  input: string;
  /** Path where the upgraded HTML should be written. */
  output: string;
  /** Directory to store generated GLB assets. */
  assetsDir: string;
  /** Tripo API key (overrides env var). */
  apiKey?: string;
  /** Limit the number of objects that will be upgraded (useful for cheap demos). */
  maxObjects?: number;
  /** Only upgrade meshes whose variable name is in this list (takes precedence over maxObjects). */
  only?: string[];
  /** Always drop meshes whose variable name is in this list (shells, bombs, particles, containers). */
  skip?: string[];

  /** If true, just print what would happen without calling Tripo. */
  dryRun?: boolean;
  /** Quality tier for Tripo. */
  quality?: "draft" | "standard" | "high";
  /** Verbose logs. */
  verbose?: boolean;
}

export interface TripoTaskResponse {
  code: number;
  data: {
    task_id: string;
  };
}

export interface TripoTaskStatus {
  code: number;
  data: {
    task_id: string;
    status: "queued" | "running" | "success" | "failed" | "cancelled" | "unknown";
    progress?: number;
    output?: {
      pbr_model?: string;
      model?: string;
      rendered_image?: string;
      [key: string]: unknown;
    };
  };
}
