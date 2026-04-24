#!/usr/bin/env node
/**
 * tripo-game CLI — shelled through `bin/tripo-game.mjs`.
 *
 * Commands:
 *   upgrade <input.html>    → produce an upgraded HTML file + assets/
 *   detect  <input.html>    → dry-run: just print the detected objects
 */

import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { upgradeGame } from "./upgrade.js";
import { detectThreeObjects } from "./parsers/threeParser.js";
import { readFile } from "node:fs/promises";

const program = new Command();

program
  .name("tripo-game")
  .description(
    "Turn AI-generated 3D games (GPT-5.5 / Claude / Codex) into Tripo-quality experiences.",
  )
  .version("0.1.0");

program
  .command("upgrade <input>")
  .description("Upgrade a Three.js HTML game with Tripo-generated 3D models.")
  .option("-o, --out <file>", "Output HTML path", "")
  .option("-a, --assets-dir <dir>", "Where to store generated GLB files", "")
  .option("-k, --api-key <key>", "Tripo API key (overrides TRIPO_API_KEY env)")
  .option(
    "-n, --max <count>",
    "Only upgrade the first N detected objects",
    (v) => Number.parseInt(v, 10),
  )
  .option(
    "--only <names>",
    "Comma-separated list of variable names to upgrade (e.g. ufo,rock,pineTree)",
    (v) => v.split(",").map((s) => s.trim()).filter(Boolean),
  )
  .option(
    "--skip <names>",
    "Comma-separated list of variable names to skip (e.g. shell,bomb,tank)",
    (v) => v.split(",").map((s) => s.trim()).filter(Boolean),
  )
  .option("-q, --quality <tier>", "draft | standard | high", "standard")
  .option("--dry-run", "Only print detected objects, do not call Tripo")
  .option("-v, --verbose", "Verbose logs")
  .action(async (input, opts) => {
    const inputAbs = path.resolve(input);
    const output =
      opts.out ||
      inputAbs.replace(/(\.html?)$/i, ".upgraded$1").replace(/^$/, "upgraded.html");
    const assetsDir = opts.assetsDir || path.join(path.dirname(output), "assets");

    console.log(chalk.bold.cyan("\n🎮 tripo-game"));
    console.log(chalk.gray(`  input  : ${inputAbs}`));
    console.log(chalk.gray(`  output : ${output}`));
    console.log(chalk.gray(`  assets : ${assetsDir}`));
    console.log();

    const detectSpinner = ora("Scanning Three.js meshes…").start();
    const spinners = new Map<string, ReturnType<typeof ora>>();

    try {
      const result = await upgradeGame(
        {
          input: inputAbs,
          output,
          assetsDir,
          apiKey: opts.apiKey,
          maxObjects: opts.max,
          only: opts.only,
          skip: opts.skip,
          dryRun: opts.dryRun,
          quality: opts.quality,
          verbose: opts.verbose,
        },
        {
          onObjectsDetected: (objects) => {
            detectSpinner.succeed(
              `Detected ${chalk.bold(objects.length)} upgradeable mesh${
                objects.length === 1 ? "" : "es"
              }`,
            );
            for (const o of objects) {
              console.log(
                `  • ${chalk.yellow(o.variableName)} (${o.originalGeometry})  ${chalk.dim(
                  "→",
                )}  ${chalk.green(o.prompt)}`,
              );
            }
            if (opts.dryRun) {
              console.log(
                chalk.yellow("\n--dry-run: skipping Tripo generation."),
              );
            }
          },
          onAssetStart: (obj) => {
            const sp = ora(
              `Generating ${chalk.yellow(obj.variableName)}…`,
            ).start();
            spinners.set(obj.id, sp);
          },
          onAssetProgress: (obj, progress) => {
            const sp = spinners.get(obj.id);
            if (sp) sp.text = `Generating ${chalk.yellow(obj.variableName)} ${Math.round(progress)}%`;
          },
          onAssetDone: (asset) => {
            const sp = spinners.get(asset.object.id);
            sp?.succeed(
              `${chalk.yellow(asset.object.variableName)} → ${chalk.cyan(
                path.relative(process.cwd(), asset.modelPath),
              )}`,
            );
          },
          onAssetFailed: (obj, err) => {
            const sp = spinners.get(obj.id);
            sp?.fail(
              `${chalk.yellow(obj.variableName)} failed: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          },
        },
      );

      console.log();
      if (opts.dryRun) {
        console.log(
          chalk.green(`✨ Dry-run complete. ${result.detected.length} meshes detected.`),
        );
        return;
      }

      const { generated, failed } = result;
      if (generated.length) {
        console.log(
          chalk.green(
            `✅ Upgraded ${generated.length}/${result.detected.length} meshes`,
          ),
        );
      }
      if (failed.length) {
        console.log(
          chalk.red(`❌ ${failed.length} mesh${failed.length === 1 ? "" : "es"} failed`),
        );
      }
      console.log(chalk.cyan(`\n👉 Open the result in a browser:`));
      console.log(chalk.white(`   open "${result.output}"`));
    } catch (err) {
      detectSpinner.fail("tripo-game failed");
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`\n${msg}\n`));
      process.exitCode = 1;
    }
  });

program
  .command("detect <input>")
  .description("Only detect upgradeable meshes in a Three.js HTML file.")
  .action(async (input) => {
    const source = await readFile(path.resolve(input), "utf8");
    const objects = detectThreeObjects(source);
    if (!objects.length) {
      console.log(chalk.yellow("No upgradeable Three.js meshes found."));
      return;
    }
    console.log(chalk.bold(`Detected ${objects.length} mesh(es):\n`));
    for (const o of objects) {
      console.log(
        `• ${chalk.yellow(o.variableName)} (${o.originalGeometry})\n  ${chalk.green(o.prompt)}`,
      );
    }
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
