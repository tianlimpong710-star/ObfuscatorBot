const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const TMP_ROOT = path.join(os.tmpdir(), "hyperion-deobf");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const maxLog = 16000;
    child.stdout.on("data", (chunk) => { stdout = (stdout + chunk.toString()).slice(-maxLog); });
    child.stderr.on("data", (chunk) => { stderr = (stderr + chunk.toString()).slice(-maxLog); });

    const timeoutMs = Number(process.env.BACKEND_TIMEOUT_MS || 180000);
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Backend timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Could not start ${command}: ${err.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const detail = (stderr || stdout || `Process exited with code ${code}`).trim();
        reject(new Error(detail.slice(-2500)));
      } else resolve({ stdout, stderr });
    });
  });
}

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

async function deobfuscate(type, version, source) {
  await fs.mkdir(TMP_ROOT, { recursive: true });
  const jobDir = await fs.mkdtemp(path.join(TMP_ROOT, "job-"));
  const input = path.join(jobDir, "input.lua");
  const output = path.join(jobDir, "output.lua");

  try {
    await fs.writeFile(input, source.replace(/\r\n?/g, "\n"), "utf8");

    if (type === "prometheus") {
      const repo = path.join(ROOT, "backends", "prometheus");
      const cli = path.join(repo, "bin", "pdeobf.js");
      if (!(await exists(cli))) throw new Error("Prometheus backend is missing. Check Docker build logs and backend clone.");
      await run(process.execPath, [cli, input, "-o", output], { cwd: repo });
    } else if (type === "moonsec") {
      const repo = path.join(ROOT, "backends", "moonsec");
      const cli = path.join(repo, "bin", "ms.js");
      if (!(await exists(cli))) throw new Error("MoonSec backend is missing. Check Docker build logs and backend clone.");
      await run(process.execPath, [cli, input, "-o", output], { cwd: repo });
    } else if (type === "luraph") {
      const repo = path.join(ROOT, "backends", "luraph", "Deobfuscator", "deobf");
      let command;
      let args;
      if (version === "14.7" || version === "14.8" || version === "14.9") {
        command = process.env.PYTHON_BIN || "python3";
        args = ["cli.py", input, "-o", output, "--engine", version];
      } else if (version === "15") {
        command = process.env.PYTHON_BIN || "python3";
        args = ["deob.py", input, "-o", output, "--obfuscator", "luraph_v15"];
      } else {
        throw new Error("Luraph version could not be determined safely. Supported versions are 14.7, 14.8, 14.9 and 15; v15.1 is not supported by this backend.");
      }
      if (!(await exists(path.join(repo, args[0])))) throw new Error("Luraph backend is missing. Check Docker build logs and backend clone.");
      await run(command, args, { cwd: repo });
    } else {
      throw new Error("Unsupported backend.");
    }

    if (!(await exists(output))) {
      throw new Error("Backend exited successfully but did not create output.lua. This sample may not be supported by the backend.");
    }
    const result = await fs.readFile(output, "utf8");
    if (!result.trim()) throw new Error("Backend produced an empty output file.");
    return result;
  } finally {
    await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { deobfuscate };
