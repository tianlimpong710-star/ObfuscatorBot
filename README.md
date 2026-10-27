# 𝙱𝚕𝚊𝚣𝚎𝚁™ Deobfuscator Bot

Discord prefix bot wrapper for three separate upstream backends. Use only on Lua/Luau code you own or are authorized to analyze.

## Commands

- `.deobf` — detect a supported backend
- `.luraph` — Luraph v14.7, v14.8, v14.9 or v15
- `.prom` — Prometheus only
- `.msec` — MoonSec V3 only
- `.help` — help panel

Attach a `.lua`, `.luau` or `.txt` file, paste source after the command, or provide a supported HTTPS URL. URL hosts supported by the fetcher: GitHub, Pastebin, Pastefy, Rubis API and PasteBDN. URL downloads are capped at 99,999 KB (streaming limit; redirects are revalidated). Set the Discord **Message Content Intent** in the Developer Portal.

## Railway deployment

1. Upload this whole project to a GitHub repository.
2. In Railway, deploy that repository and let it use the included `Dockerfile`.
3. In Railway → service → **Variables**, add:
   - `DISCORD_TOKEN` — your bot token
   - `MAINTAINER_ID` — your Discord user ID
   - `PREFIX` — `.`
   - `MAX_SOURCE_KB` — `99999` (maximum source size for pasted code, attachments and URL downloads)
   - `BACKEND_TIMEOUT_MS` — `180000`
4. Read **Build Logs** and **Deploy Logs** after the first deployment.

Do not commit `.env` or share your bot token.

## Important backend notes

- The bot code and backend adapters are included, but the three deobfuscators are cloned from their upstream repositories during Docker build.
- Prometheus CLI is invoked as `node bin/pdeobf.js input.lua -o output.lua`.
- MoonSec CLI is invoked as `node bin/ms.js input.lua -o output.lua`.
- Luraph v14 uses `python3 cli.py input.lua -o output.lua --engine VERSION`; v15 uses `python3 deob.py input.lua -o output.lua --obfuscator luraph_v15`.
- The Luraph repository currently bundles Windows Luau executables. Railway runs Linux, so Luraph may need Linux-compatible Luau tools and may fail until those are built and configured. Do not assume all Luraph versions work on Railway just because the bot starts.
- Luraph v15.1 is not supported by the selected public backend.
- Obfuscator detection is heuristic; unknown or heavily modified samples may be misidentified. Deobfuscation is best-effort and may not reproduce original source.
- Uploaded Lua/Luau source is never run by this Discord wrapper. Backends are invoked as child processes, but treat untrusted inputs cautiously.

## Detection checks

Run `npm run check`. The included unit tests verify the detector against the supplied Luraph v14.7, v14.8, v14.9 and v15.0 samples, plus synthetic Prometheus/MoonSec headers and ordinary Lua. Detection is heuristic and does not prove a backend can successfully deobfuscate every sample.

## Local checks

Requires Node.js 20+. Run `npm install`, copy `.env.example` to `.env`, fill in `DISCORD_TOKEN`, then run `npm run check` and `npm start`.
