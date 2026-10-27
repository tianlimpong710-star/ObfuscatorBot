const ALLOWED_HOSTS = new Set([
  "github.com", "raw.githubusercontent.com", "pastebin.com", "www.pastebin.com",
  "pastefy.app", "api.rubis.app", "cdn.pastebdn.workers.dev"
]);

function assertAllowedUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("That does not look like a valid URL."); }
  if (url.protocol !== "https:") throw new Error("Only HTTPS source URLs are allowed.");
  if (url.username || url.password) throw new Error("URLs containing credentials are not allowed.");
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("Unsupported URL host. Supported hosts: GitHub, Pastebin, Pastefy, Rubis API and PasteBDN.");
  }
  return url;
}

function normalizeSourceUrl(value) {
  let url = assertAllowedUrl(value.trim());
  const host = url.hostname.toLowerCase();

  if (host === "github.com") {
    const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
    if (match) url = new URL(`https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}/${match[4]}`);
    else if (!/^\/[^/]+\/[^/]+\/raw\//.test(url.pathname)) {
      throw new Error("For GitHub, use a raw.githubusercontent.com link or a github.com/.../blob/... file link.");
    }
  } else if (host === "www.pastebin.com") {
    url.hostname = "pastebin.com";
  }

  if (url.hostname === "pastebin.com") {
    const match = url.pathname.match(/^\/(?:raw\/)?([A-Za-z0-9]+)\/?$/);
    if (match && !url.pathname.startsWith("/raw/")) url.pathname = `/raw/${match[1]}`;
  } else if (url.hostname === "pastefy.app") {
    const match = url.pathname.match(/^\/([A-Za-z0-9_-]+)\/?$/);
    if (match && match[1] !== "api") url.pathname = `/${match[1]}/raw`;
  }
  return url;
}

function unwrapText(text, contentType) {
  if (/json/i.test(contentType) || /^[\s]*[\[{]/.test(text)) {
    try {
      const parsed = JSON.parse(text);
      const queue = [parsed];
      for (let i = 0; queue.length && i < 30; i++) {
        const item = queue.shift();
        if (typeof item === "string") {
          if (/^(?:return\b|local\b|--|\/\/|print\s*\(|function\b|\s*\()/.test(item.trim())) return item;
          continue;
        }
        if (item && typeof item === "object") {
          for (const key of ["content", "text", "raw", "source", "code"]) {
            if (typeof item[key] === "string") return item[key];
          }
          for (const key of ["data", "result", "paste", "body"]) if (item[key] != null) queue.push(item[key]);
        }
      }
    } catch { /* It may be source code beginning with a bracket. */ }
  }
  return text;
}

async function fetchSourceFromUrl(rawUrl, maxBytes) {
  let url = normalizeSourceUrl(rawUrl);
  const maxRedirects = 4;
  let response;
  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    assertAllowedUrl(url.href);
    response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20000), headers: { "user-agent": "BlazeR-SourceFetcher/1.0", accept: "text/plain, application/json, */*" } });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get("location");
    if (!location || redirects === maxRedirects) throw new Error("Source URL redirected too many times or had an invalid redirect.");
    url = new URL(location, url);
  }
  if (!response || !response.ok) throw new Error(`Could not fetch URL (HTTP ${response?.status || "unknown"}).`);
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new Error(`URL content exceeds the 99,999 KB source limit.`);
  if (!response.body) throw new Error("The URL returned an empty response.");

  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.length;
    if (total > maxBytes) {
      await response.body.cancel().catch(() => {});
      throw new Error("URL content exceeds the 99,999 KB source limit.");
    }
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  const content = unwrapText(raw, response.headers.get("content-type") || "");
  if (!content.trim()) throw new Error("The URL returned empty content.");
  if (content.trimStart().startsWith("<!DOCTYPE html") || content.trimStart().startsWith("<html")) {
    throw new Error("The URL returned an HTML page, not raw source. Use the service's raw link.");
  }
  if (Buffer.byteLength(content, "utf8") > maxBytes) throw new Error("URL source exceeds the 99,999 KB source limit.");
  return content;
}

module.exports = { normalizeSourceUrl, fetchSourceFromUrl };
