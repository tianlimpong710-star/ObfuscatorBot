function detectLuraphVersion(source) {
  const text = String(source || "");
  const header = text.match(/Luraph\s+Obfuscator\s+v?(14\.7|14\.8|14\.9|15(?:\.0)?)/i);
  if (header) return { type: "luraph", version: header[1].startsWith("15") ? "15" : header[1] };

  // Header-stripped samples are inherently less reliable to identify.
  if (/Luraph|LPH_ENCSTR|LPH_CRASH|LPH_NO_VIRTUALIZE/i.test(text)) {
    return { type: "luraph", version: "unknown" };
  }
  return null;
}

function detectPrometheus(source) {
  const text = String(source || "");
  const signals = [
    /Prometheus\s+Obfuscator/i,
    /--\s*Prometheus/i,
    /getfenv\s*\(\s*\)\s*\[\s*["'][^"']+["']\s*\]/i,
    /local\s+\w+\s*=\s*\{\s*(?:\[\d+\]\s*=\s*["'][^"']*["']\s*,?\s*){3,}/i
  ];
  return signals.filter((rx) => rx.test(text)).length >= 1;
}

function detectMoonsec(source) {
  const text = String(source || "");
  return /MoonSec\s*(?:V|v)?3|MoonSec\s+Obfuscator/i.test(text) ||
    (/bit32\.(?:bxor|band|bor|bnot)/.test(text) &&
     /loadstring|setfenv|unpack/.test(text) &&
     /string\.char|string\.byte/.test(text));
}

function detectAny(source) {
  const luraph = detectLuraphVersion(source);
  if (luraph) return luraph;
  if (detectPrometheus(source)) return { type: "prometheus" };
  if (detectMoonsec(source)) return { type: "moonsec" };
  return null;
}

module.exports = { detectLuraphVersion, detectPrometheus, detectMoonsec, detectAny };
