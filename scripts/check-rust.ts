import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { resolve } from "node:path";

const rustManifestPath = resolve("Cargo.toml");

if (await isReadable(rustManifestPath)) {
  await run("cargo", ["fmt", "--all", "--check"]);
  await run("cargo", ["test", "--workspace"]);
  await run("cargo", ["clippy", "--workspace", "--all-targets", "--", "-D", "warnings"]);
} else {
  console.log("Rust checks: ready for Cargo.toml");
}

async function isReadable(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function run(command: string, argumentsList: string[]): Promise<void> {
  await new Promise<void>((resolveCommand, rejectCommand) => {
    const childProcess = spawn(command, argumentsList, { stdio: "inherit" });

    childProcess.once("error", rejectCommand);
    childProcess.once("exit", (exitCode) => {
      if (exitCode === 0) {
        resolveCommand();
        return;
      }

      rejectCommand(new Error(`${command} exited with code ${String(exitCode)}`));
    });
  });
}
