require("dotenv").config();

const {
  Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, Events
} = require("discord.js");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { detectLuraphVersion, detectPrometheus, detectMoonsec, detectAny } = require("./src/detector");
const { deobfuscate } = require("./src/backends");

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = process.env.PREFIX || ".";
const MAINTAINER_ID = process.env.MAINTAINER_ID || "127894961235";
const MAX_BYTES = Math.max(1, Number(process.env.MAX_SOURCE_MB || 1.5)) * 1024 * 1024;
const GIF_URL = "https://cdn.imageurlgenerator.com/uploads/f7af7a46-43d6-4f70-89c0-b4ff901382a0.gif";
const OK = "<:CekMark:1564402704921534514>";
const FAIL = "<:Xmark:1564402706800713818>";
const busy = new Set();

if (!TOKEN) {
  console.error("Missing DISCORD_TOKEN. Add it in Railway → Service → Variables.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

function makeProcessingEmbed() {
  return new EmbedBuilder()
    .setColor(0x202020)
    .setTitle("Processing")
    .setDescription("⏳ Detecting Obfuscator\n⏳ Wrapping the lines\n⏳ Deobfuscating")
    .setImage(GIF_URL)
    .setTimestamp();
}

function formatDuration(ms) {
  return `${(ms / 60000).toFixed(2)} minutes`;
}

async function getSource(message, argsText) {
  const attachment = message.attachments.first();
  if (attachment) {
    const ext = path.extname(attachment.name || "").toLowerCase();
    if (![".lua", ".luau", ".txt"].includes(ext)) throw new Error("Upload a .lua, .luau, or .txt file.");
    if (attachment.size > MAX_BYTES) throw new Error(`File is too large. Maximum size is ${(MAX_BYTES / 1024 / 1024).toFixed(1)} MB.`);
    const response = await fetch(attachment.url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Could not download attachment (HTTP ${response.status}).`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_BYTES) throw new Error("Downloaded file exceeds the configured size limit.");
    return buffer.toString("utf8");
  }
  const source = argsText.trim();
  if (!source) throw new Error(`Add Lua/Luau code after ${PREFIX}deobf or attach a file.`);
  if (Buffer.byteLength(source, "utf8") > MAX_BYTES) throw new Error(`Code is too large. Maximum is ${(MAX_BYTES / 1024 / 1024).toFixed(1)} MB.`);
  return source;
}

function detectForCommand(command, source) {
  if (command === "luraph") return detectLuraphVersion(source);
  if (command === "prom") return detectPrometheus(source) ? { type: "prometheus" } : null;
  if (command === "msec") return detectMoonsec(source) ? { type: "moonsec" } : null;
  return detectAny(source);
}

function displayName(detection) {
  if (detection.type === "luraph") return detection.version === "unknown" ? "Luraph (version unknown)" : `Luraph v${detection.version}`;
  if (detection.type === "prometheus") return "Prometheus";
  if (detection.type === "moonsec") return "MoonSec V3";
  return "Unknown";
}

function reportRow(messageId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`report_error:${messageId}`)
      .setLabel("Report Error")
      .setStyle(ButtonStyle.Danger)
  );
}

async function handleCommand(message, command, argsText) {
  const start = Date.now();
  if (busy.has(message.author.id)) {
    await message.reply("Please wait for your current job to finish before starting another.");
    return;
  }
  busy.add(message.author.id);

  let statusMessage;
  let detectedName = "Unknown";
  try {
    const source = await getSource(message, argsText);
    statusMessage = await message.reply({ embeds: [makeProcessingEmbed()] });

    const detection = detectForCommand(command, source);
    if (!detection) {
      const embed = new EmbedBuilder()
        .setColor(0xD62828)
        .setTitle("Error")
        .setDescription(`${FAIL} Unknown obfuscator\nObfuscation Failed ${message.author} Unsupported obfuscator. Report it to the owner?`)
        .setTimestamp();
      await statusMessage.edit({ embeds: [embed], components: [reportRow(message.id)] });
      return;
    }

    detectedName = displayName(detection);
    const firstStage = new EmbedBuilder()
      .setColor(0x202020)
      .setTitle("Processing")
      .setDescription(`${OK} Detected: ${detectedName}\n⏳ Wrapping the lines\n⏳ Deobfuscating`)
      .setImage(GIF_URL)
      .setTimestamp();
    await statusMessage.edit({ embeds: [firstStage] });

    // Wrapping is deliberately limited to newline normalization; no syntax-changing rewrites.
    const wrappedSource = source.replace(/\r\n?/g, "\n");
    const secondStage = new EmbedBuilder()
      .setColor(0x202020)
      .setTitle("Processing")
      .setDescription(`${OK} Detected: ${detectedName}\n${OK} Wrapping Lines Complete\n⏳ Deobfuscating`)
      .setImage(GIF_URL)
      .setTimestamp();
    await statusMessage.edit({ embeds: [secondStage] });

    const result = await deobfuscate(detection.type, detection.version, wrappedSource);
    const duration = Date.now() - start;
    const outPath = path.join(os.tmpdir(), `hyperion-${Date.now()}.lua`);
    await fs.writeFile(outPath, result, "utf8");

    const success = new EmbedBuilder()
      .setColor(0x2D6A4F)
      .setTitle("Deobfuscation Complete")
      .setDescription(`${OK} Detected: ${detectedName}\n${OK} Wrapping Lines Complete\n${OK} Deobfuscation Complete\n**Elapsed:** ${formatDuration(duration)}`)
      .setTimestamp();
    await statusMessage.edit({ embeds: [success], components: [] });
    await message.reply({ files: [new AttachmentBuilder(outPath, { name: "deobfuscated.lua" })] });
    await fs.rm(outPath, { force: true }).catch(() => {});
  } catch (error) {
    const duration = Date.now() - start;
    const summary = String(error?.message || error || "Unknown error").slice(0, 1200);
    console.error(`[${command}] ${summary}`);
    const embed = new EmbedBuilder()
      .setColor(0xD62828)
      .setTitle("Error")
      .setDescription(`${FAIL} Obfuscation Failed ${message.author}\nUnsupported sample or backend error. Report it to the owner?\n\n**Elapsed:** ${formatDuration(duration)}`)
      .setTimestamp();
    try {
      if (statusMessage) await statusMessage.edit({ embeds: [embed], components: [reportRow(message.id)] });
      else await message.reply({ embeds: [embed], components: [reportRow(message.id)] });
    } catch (editError) {
      console.error("Could not send error embed:", editError.message);
    }
  } finally {
    busy.delete(message.author.id);
  }
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  console.log(`Prefix: ${PREFIX}`);
  console.log("Do not execute uploaded Lua/Luau source directly; backends are called as separate processes.");
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;
  const body = message.content.slice(PREFIX.length).trim();
  const firstSpace = body.indexOf(" ");
  const command = (firstSpace === -1 ? body : body.slice(0, firstSpace)).toLowerCase();
  const argsText = firstSpace === -1 ? "" : body.slice(firstSpace + 1);

  if (command === "help") {
    const embed = new EmbedBuilder()
      .setColor(0x202020)
      .setTitle("Hyperion Deobfuscator — Help")
      .setDescription([
        `\`${PREFIX}deobf\` — Auto-detect a supported obfuscator`,
        `\`${PREFIX}luraph\` — Deobfuscate supported Luraph v14.7/v14.8/v14.9/v15`,
        `\`${PREFIX}prom\` — Prometheus only`,
        `\`${PREFIX}msec\` — MoonSec V3 only`,
        `\`${PREFIX}help\` — Show this panel`,
        "",
        "Attach a `.lua`, `.luau`, or `.txt` file, or paste code after the command.",
        "Use only on code you own or are authorized to analyze. Recovery is not guaranteed."
      ].join("\n"));
    await message.reply({ embeds: [embed] });
    return;
  }

  if (!["deobf", "luraph", "prom", "msec"].includes(command)) return;
  await handleCommand(message, command, argsText);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton() || !interaction.customId.startsWith("report_error:")) return;
  const originalMessageId = interaction.customId.split(":")[1];
  try {
    const owner = await client.users.fetch(MAINTAINER_ID);
    await owner.send([
      "Hyperion Deobfuscator error report",
      `Reporter: ${interaction.user.tag} (${interaction.user.id})`,
      `Server: ${interaction.guild?.name || "DM"} (${interaction.guildId || "n/a"})`,
      `Message ID: ${originalMessageId}`,
      `Report clicked at: ${new Date().toISOString()}`,
      "Source code was not attached to this report."
    ].join("\n"));
    await interaction.reply({ content: "Report sent to the bot owner. Source code was not included.", ephemeral: true });
  } catch (error) {
    console.error("Report delivery failed:", error.message);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Could not deliver the report. The owner may have DMs disabled.", ephemeral: true }).catch(() => {});
    }
  }
});

client.login(TOKEN).catch((error) => {
  console.error("Discord login failed:", error.message);
  process.exit(1);
});
