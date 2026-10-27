
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", chunk => {
      stdout = (stdout + chunk.toString()).slice(-12000);
    });

    child.stderr.on("data", chunk => {
      stderr = (stderr + chunk.toString()).slice(-12000);
    });

    const timeoutMs = Number(
      process.env.BACKEND_TIMEOUT_MS || 180000
    );

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(
        new Error(
          `Backend timed out after ${Math.round(timeoutMs / 1000)} seconds.`
        )
      );
    }, timeoutMs);

    child.once("error", error => {
      clearTimeout(timer);
      reject(new Error(`Could not start ${command}: ${error.message}`));
    });

    child.once("close", code => {
      clearTimeout(timer);

      if (code !== 0) {
        reject(
          new Error(
            (stderr || stdout || `Backend exited with code ${code}`).slice(-2000)
          )
        );
      } else {
        resolve();
      }
    });
  });
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function deobfuscate(type, version, source) {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "blazer-deobf-")
  );

  const input = path.join(tempDir, "input.lua");
  const output = path.join(tempDir, "output.lua");

  try {
    await fs.writeFile(
      input,
      String(source).replace(/\r\n?/g, "\n"),
      "utf8"
    );

    let cwd;
    let command;
    let args;

    if (type === "prometheus") {
      cwd = path.join(ROOT, "backends", "prometheus");
      command = process.execPath;
      args = ["bin/pdeobf.js", input, "-o", output];
    } else if (type === "moonsec") {
      cwd = path.join(ROOT, "backends", "moonsec");
      command = process.execPath;
      args = ["bin/ms.js", input, "-o", output];
    } else if (type === "luraph") {
      cwd = path.join(
        ROOT,
        "backends",
        "luraph",
        "Deobfuscator",
        "deobf"
      );

      if (!["14.7", "14.8", "14.9", "15"].includes(version)) {
        throw new Error(
          `Unsupported Luraph version: ${version}.`
        );
      }

      command = process.env.PYTHON_BIN || "python3";

      if (version === "15") {
        args = [
          "deob.py",
          input,
          "-o",
          output,
          "--obfuscator",
          "luraph_v15"
        ];
      } else {
        args = [
          "cli.py",
          input,
          "-o",
          output,
          "--engine",
          version
        ];
      }
    } else {
      throw new Error(`Unknown backend: ${type}`);
    }

    if (!(await exists(cwd))) {
      throw new Error(
        `Backend folder missing for ${type}. Check your Dockerfile.`
      );
    }

    if (!(await exists(path.join(cwd, args[0])))) {
      throw new Error(
        `Backend program ${args[0]} is missing in ${cwd}.`
      );
    }

    await run(command, args, cwd);

    if (!(await exists(output))) {
      throw new Error(
        "Backend finished without creating output.lua. The backend CLI may need adjustment."
      );
    }

    const result = await fs.readFile(output, "utf8");

    if (!result.trim()) {
      throw new Error("Backend returned an empty output file.");
    }

    return result;
  } finally {
    await fs.rm(tempDir, {
      recursive: true,
      force: true
    }).catch(() => {});
  }
}

module.exports = { deobfuscate };
                             
