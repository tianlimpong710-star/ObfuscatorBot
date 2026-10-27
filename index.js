require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  MessageFlags
} = require("discord.js");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");

const {
  detectLuraphVersion,
  detectPrometheus,
  detectMoonsec,
  detectAny
} = require("./src/detector");
const { deobfuscate } = require("./src/backends");

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = process.env.PREFIX || ".";
const MAINTAINER_ID = process.env.MAINTAINER_ID || "127894961235";
const MAX_BYTES =
  Math.max(0.1, Number(process.env.MAX_SOURCE_MB || 1.5)) * 1024 * 1024;
const GIF_URL =
  "https://cdn.imageurlgenerator.com/uploads/f7af7a46-43d6-4f70-89c0-b4ff901382a0.gif";

const OK = "<:CekMark:1564402704921534514>";
const FAIL = "<:Xmark:1564402706800713818>";
const busyUsers = new Set();

if (!TOKEN) {
  console.error(
    "Missing DISCORD_TOKEN. Add it in Railway → your service → Variables."
  );
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

function makeProcessingEmbed(description) {
  return new EmbedBuilder()
    .setColor(0x202020)
    .setTitle("𝙱𝚕𝚊𝚣𝚎𝚁™ | Processing")
    .setDescription(description)
    .setImage(GIF_URL)
    .setTimestamp();
}

function durationInMinutes(ms) {
  return `${(ms / 60000).toFixed(2)} minutes`;
}

async function getSource(message, argsText) {
  const attachment = message.attachments.first();

  if (attachment) {
    const extension = path.extname(attachment.name || "").toLowerCase();

    if (![".lua", ".luau", ".txt"].includes(extension)) {
      throw new Error("Please upload a .lua, .luau, or .txt file.");
    }

    if (attachment.size > MAX_BYTES) {
      throw new Error(
        `File too large. Maximum size: ${(MAX_BYTES / 1024 / 1024).toFixed(1)} MB.`
      );
    }

    const response = await fetch(attachment.url, {
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Could not download attachment (HTTP ${response.status}).`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length > MAX_BYTES) {
      throw new Error("Downloaded file exceeds the configured size limit.");
    }

    return buffer.toString("utf8");
  }

  const source = argsText.trim();

  if (!source) {
    throw new Error(
      `Attach a .lua/.luau/.txt file or paste code after ${PREFIX}${"deobf"}.`
    );
  }

  if (Buffer.byteLength(source, "utf8") > MAX_BYTES) {
    throw new Error(
      `Code too large. Maximum size: ${(MAX_BYTES / 1024 / 1024).toFixed(1)} MB.`
    );
  }

  return source;
}

function detectForCommand(command, source) {
  if (command === "luraph") {
    return detectLuraphVersion(source);
  }

  if (command === "prom") {
    return detectPrometheus(source) ? { type: "prometheus" } : null;
  }

  if (command === "msec") {
    return detectMoonsec(source) ? { type: "moonsec" } : null;
  }

  return detectAny(source);
}

function getDisplayName(detection) {
  if (detection.type === "luraph") {
    return detection.version === "unknown"
      ? "Luraph (version unknown)"
      : `Luraph v${detection.version}`;
  }

  if (detection.type === "prometheus") return "Prometheus";
  if (detection.type === "moonsec") return "MoonSec V3";
  return "Unknown obfuscator";
}

function reportButton(messageId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`report_error:${messageId}`)
      .setLabel("Report Error")
      .setStyle(ButtonStyle.Danger)
  );
}

function makeErrorEmbed(message, details, elapsedMs) {
  return new EmbedBuilder()
    .setColor(0xd62828)
    .setTitle("𝙱𝚕𝚊𝚣𝚎𝚁™ | Error")
    .setDescription(
      `${FAIL} Obfuscation Failed ${message.author}\n${details}\n\n**Elapsed:** ${durationInMinutes(elapsedMs)}`
    )
    .setTimestamp();
}

async function handleCommand(message, command, argsText) {
  const startedAt = Date.now();
  let statusMessage = null;
  let detectedName = "Unknown";

  if (busyUsers.has(message.author.id)) {
    await message.reply(
      "Please wait for your current deobfuscation job to finish."
    );
    return;
  }

  busyUsers.add(message.author.id);

  try {
    const source = await getSource(message, argsText);

    statusMessage = await message.reply({
      embeds: [
        makeProcessingEmbed(
          "⏳ Detecting Obfuscator\n⏳ Wrapping the lines\n⏳ Deobfuscating"
        )
      ]
    });

    const detection = detectForCommand(command, source);

    if (!detection) {
      const errorEmbed = makeErrorEmbed(
        message,
        `${FAIL} Unknown obfuscator\nUnsupported obfuscator. Report it to the owner?`,
        Date.now() - startedAt
      );

      await statusMessage.edit({
        embeds: [errorEmbed],
        components: [reportButton(message.id)]
      });
      return;
    }

    detectedName = getDisplayName(detection);

    await statusMessage.edit({
      embeds: [
        makeProcessingEmbed(
          `${OK} Detected: ${detectedName}\n⏳ Wrapping the lines\n⏳ Deobfuscating`
        )
      ]
    });

    // Safe normalization only: convert Windows/macOS line endings to LF.
    // This does not execute or intentionally rewrite Lua/Luau logic.
    const normalizedSource = source.replace(/\r\n?/g, "\n");

    await statusMessage.edit({
      embeds: [
        makeProcessingEmbed(
          `${OK} Detected: ${detectedName}\n${OK} Wrapping Lines Complete\n⏳ Deobfuscating`
        )
      ]
    });

    const output = await deobfuscate(
      detection.type,
      detection.version,
      normalizedSource
    );

    const elapsedMs = Date.now() - startedAt;
    const outputPath = path.join(
      os.tmpdir(),
      `blazer-deobfuscated-${Date.now()}-${message.author.id}.lua`
    );

    try {
      await fs.writeFile(outputPath, output, "utf8");

      const successEmbed = new EmbedBuilder()
        .setColor(0x2d6a4f)
        .setTitle("𝙱𝚕𝚊𝚣𝚎𝚁™ | Deobfuscation Complete")
        .setDescription(
          `${OK} Detected: ${detectedName}\n${OK} Wrapping Lines Complete\n${OK} Deobfuscation Complete\n\n**Elapsed:** ${durationInMinutes(elapsedMs)}`
        )
        .setTimestamp();

      await statusMessage.edit({ embeds: [successEmbed], components: [] });

      await message.reply({
        files: [
          new AttachmentBuilder(outputPath, { name: "deobfuscated.lua" })
        ]
      });
    } finally {
      await fs.rm(outputPath, { force: true }).catch(() => {});
    }
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    const summary = String(error?.message || error || "Unknown error").slice(
      0,
      1200
    );

    console.error(`[${command}] ${summary}`);

    const errorEmbed = makeErrorEmbed(
      message,
      `${FAIL} Unsupported sample or backend error. Report it to the owner?`,
      elapsedMs
    );

    try {
      if (statusMessage) {
        await statusMessage.edit({
          embeds: [errorEmbed],
          components: [reportButton(message.id)]
        });
      } else {
        await message.reply({
          embeds: [errorEmbed],
          components: [reportButton(message.id)]
        });
      }
    } catch (replyError) {
      console.error("Could not send error embed:", replyError.message);
    }
  } finally {
    busyUsers.delete(message.author.id);
  }
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  console.log(`Prefix: ${PREFIX}`);
  console.log("BlazeR deobfuscator bot is online.");
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const body = message.content.slice(PREFIX.length).trim();
  if (!body) return;

  const firstSpace = body.indexOf(" ");
  const command = (
    firstSpace === -1 ? body : body.slice(0, firstSpace)
  ).toLowerCase();
  const argsText = firstSpace === -1 ? "" : body.slice(firstSpace + 1);

  if (command === "help") {
    const embed = new EmbedBuilder()
      .setColor(0x202020)
      .setTitle("𝙱𝚕𝚊𝚣𝚎𝚁™ | Help Panel")
      .setDescription(
        [
          `\`${PREFIX}deobf\` — Auto-detect a supported obfuscator`,
          `\`${PREFIX}luraph\` — Detect and process supported Luraph versions`,
          `\`${PREFIX}prom\` — Deobfuscate Prometheus only`,
          `\`${PREFIX}msec\` — Deobfuscate MoonSec V3 only`,
          `\`${PREFIX}help\` — Show this help panel`,
          "",
          "Attach a `.lua`, `.luau`, or `.txt` file, or paste code after the command.",
          "Use only on code you own or are authorized to analyze. Recovery is not guaranteed."
        ].join("\n")
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    return;
  }

  if (!["deobf", "luraph", "prom", "msec"].includes(command)) return;

  await handleCommand(message, command, argsText);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (
    !interaction.isButton() ||
    !interaction.customId.startsWith("report_error:")
  ) {
    return;
  }

  const originalMessageId = interaction.customId.split(":")[1];

  try {
    const owner = await client.users.fetch(MAINTAINER_ID);

    await owner.send(
      [
        "BlazeR deobfuscator error report",
        `Reporter: ${interaction.user.tag} (${interaction.user.id})`,
        `Server: ${interaction.guild?.name || "DM"} (${interaction.guildId || "n/a"})`,
        `Original message ID: ${originalMessageId}`,
        `Report time: ${new Date().toISOString()}`,
        "Source code was not included."
      ].join("\n")
    );

    await interaction.reply({
      content: "Report sent to the bot owner. Source code was not included.",
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    console.error("Report delivery failed:", error.message);

    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content:
            "Could not deliver the report. The owner may have DMs disabled.",
          flags: MessageFlags.Ephemeral
        })
        .catch(() => {});
    }
  }
});

client.login(TOKEN).catch((error) => {
  console.error("Discord login failed:", error.message);
  process.exit(1);
});
