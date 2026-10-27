
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
const MAINTAINER_ID =
  process.env.MAINTAINER_ID || "127894961235";

const MAX_BYTES =
  Math.max(0.1, Number(process.env.MAX_SOURCE_MB || 1.5)) *
  1024 * 1024;

const GIF_URL =
  "https://cdn.imageurlgenerator.com/uploads/f7af7a46-43d6-4f70-89c0-b4ff901382a0.gif";

const OK = "<:CekMark:1564402704921534514>";
const FAIL = "<:Xmark:1564402706800713818>";

const busyUsers = new Set();

if (!TOKEN) {
  console.error("Missing DISCORD_TOKEN in Railway Variables.");
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

function elapsed(ms) {
  return `${(ms / 60000).toFixed(2)} minutes`;
}

async function getSource(message, args) {
  const attachment = message.attachments.first();

  if (attachment) {
    const ext = path.extname(attachment.name || "").toLowerCase();

    if (![".lua", ".luau", ".txt"].includes(ext)) {
      throw new Error("Upload a .lua, .luau, or .txt file.");
    }

    if (attachment.size > MAX_BYTES) {
      throw new Error(
        `File exceeds the ${(MAX_BYTES / 1048576).toFixed(1)} MB limit.`
      );
    }

    const response = await fetch(attachment.url, {
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Attachment download failed: HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length > MAX_BYTES) {
      throw new Error("Downloaded attachment exceeds the size limit.");
    }

    return buffer.toString("utf8");
  }

  const source = args.trim();

  if (!source) {
    throw new Error(
      `Attach a Lua file or paste code after ${PREFIX}deobf.`
    );
  }

  if (Buffer.byteLength(source, "utf8") > MAX_BYTES) {
    throw new Error("Pasted code exceeds the size limit.");
  }

  return source;
}

function detectCommand(command, source) {
  if (command === "luraph") {
    return detectLuraphVersion(source);
  }

  if (command === "prom") {
    return detectPrometheus(source)
      ? { type: "prometheus" }
      : null;
  }

  if (command === "msec") {
    return detectMoonsec(source)
      ? { type: "moonsec" }
      : null;
  }

  return detectAny(source);
}

function detectorName(detection) {
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

function errorEmbed(message, reason, ms) {
  return new EmbedBuilder()
    .setColor(0xd62828)
    .setTitle("𝙱𝚕𝚊𝚣𝚎𝚁™ | Error")
    .setDescription(
      `${FAIL} Obfuscation Failed ${message.author}\n` +
      `${reason}\n\n**Elapsed:** ${elapsed(ms)}`
    )
    .setTimestamp();
}

async function handleCommand(message, command, args) {
  const started = Date.now();
  let status = null;

  if (busyUsers.has(message.author.id)) {
    await message.reply(
      "Please wait for your current job to finish."
    );
    return;
  }

  busyUsers.add(message.author.id);

  try {
    const source = await getSource(message, args);

    status = await message.reply({
      embeds: [
        makeProcessingEmbed(
          "⏳ Detecting Obfuscator\n" +
          "⏳ Wrapping the lines\n" +
          "⏳ Deobfuscating"
        )
      ]
    });

    const detection = detectCommand(command, source);

    if (!detection) {
      await status.edit({
        embeds: [
          errorEmbed(
            message,
            `${FAIL} Unknown obfuscator. Report it to the owner?`,
            Date.now() - started
          )
        ],
        components: [reportButton(message.id)]
      });
      return;
    }

    const name = detectorName(detection);

    await status.edit({
      embeds: [
        makeProcessingEmbed(
          `${OK} Detected: ${name}\n` +
          "⏳ Wrapping the lines\n" +
          "⏳ Deobfuscating"
        )
      ]
    });

    // Only normalize line endings. Do not execute uploaded source.
    const normalized = source.replace(/\r\n?/g, "\n");

    await status.edit({
      embeds: [
        makeProcessingEmbed(
          `${OK} Detected: ${name}\n` +
          `${OK} Wrapping Lines Complete\n` +
          "⏳ Deobfuscating"
        )
      ]
    });

    const result = await deobfuscate(
      detection.type,
      detection.version,
      normalized
    );

    const outputPath = path.join(
      os.tmpdir(),
      `blazer-${Date.now()}-${message.author.id}.lua`
    );

    try {
      await fs.writeFile(outputPath, result, "utf8");

      const success = new EmbedBuilder()
        .setColor(0x2d6a4f)
        .setTitle("𝙱𝚕𝚊𝚣𝚎𝚁™ | Complete")
        .setDescription(
          `${OK} Detected: ${name}\n` +
          `${OK} Wrapping Lines Complete\n` +
          `${OK} Deobfuscation Complete\n\n` +
          `**Elapsed:** ${elapsed(Date.now() - started)}`
        )
        .setTimestamp();

      await status.edit({
        embeds: [success],
        components: []
      });

      await message.reply({
        files: [
          new AttachmentBuilder(outputPath, {
            name: "deobfuscated.lua"
          })
        ]
      });
    } finally {
      await fs.rm(outputPath, { force: true }).catch(() => {});
    }
  } catch (error) {
    console.error(
      `[${command}]`,
      error?.stack || error
    );

    const embed = errorEmbed(
      message,
      `${FAIL} The sample or backend failed. Report it to the owner?`,
      Date.now() - started
    );

    try {
      if (status) {
        await status.edit({
          embeds: [embed],
          components: [reportButton(message.id)]
        });
      } else {
        await message.reply({
          embeds: [embed],
          components: [reportButton(message.id)]
        });
      }
    } catch (replyError) {
      console.error("Error response failed:", replyError.message);
    }
  } finally {
    busyUsers.delete(message.author.id);
  }
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  console.log("𝙱𝚕𝚊𝚣𝚎𝚁™ is online.");
  console.log(`Prefix: ${PREFIX}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) {
    return;
  }

  const body = message.content.slice(PREFIX.length).trim();
  if (!body) return;

  const space = body.indexOf(" ");
  const command = (
    space === -1 ? body : body.slice(0, space)
  ).toLowerCase();

  const args = space === -1 ? "" : body.slice(space + 1);

  if (command === "help") {
    const embed = new EmbedBuilder()
      .setColor(0x202020)
      .setTitle("𝙱𝚕𝚊𝚣𝚎𝚁™ | Help Panel")
      .setDescription([
        `\`${PREFIX}deobf\` — Auto-detect a supported obfuscator`,
        `\`${PREFIX}luraph\` — Process supported Luraph versions`,
        `\`${PREFIX}prom\` — Prometheus only`,
        `\`${PREFIX}msec\` — MoonSec V3 only`,
        `\`${PREFIX}help\` — Show this help panel`,
        "",
        "Attach a .lua, .luau, or .txt file, or paste your code.",
        "Use only on code you own or are authorized to analyze."
      ].join("\n"))
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    return;
  }

  if (["deobf", "luraph", "prom", "msec"].includes(command)) {
    await handleCommand(message, command, args);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (
    !interaction.isButton() ||
    !interaction.customId.startsWith("report_error:")
  ) {
    return;
  }

  try {
    const owner = await client.users.fetch(MAINTAINER_ID);

    await owner.send([
      "𝙱𝚕𝚊𝚣𝚎𝚁™ error report",
      `Reporter: ${interaction.user.tag} (${interaction.user.id})`,
      `Server: ${interaction.guild?.name || "DM"}`,
      `Message ID: ${interaction.customId.split(":")[1]}`,
      `Time: ${new Date().toISOString()}`,
      "Source code was not included."
    ].join("\n"));

    await interaction.reply({
      content: "Report sent. Source code was not included.",
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    console.error("Report delivery failed:", error.message);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Could not send the report to the owner.",
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }
  }
});

client.login(TOKEN).catch((error) => {
  console.error("Discord login failed:", error);
  process.exit(1);
});
    
