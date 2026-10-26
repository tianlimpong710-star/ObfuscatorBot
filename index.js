require("dotenv").config();

const {
Client,
GatewayIntentBits,
EmbedBuilder,
AttachmentBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");

const { detectLuraphVersion, detectPrometheus, detectMoonsec, detectAny } =
require("./src/detector");

const { deobfuscate } = require("./src/backends");

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = process.env.PREFIX || ".";
const OWNER_ID = process.env.MAINTAINER_ID || "127894961235";
const MAX_BYTES = Number(process.env.MAX_SOURCE_MB || 1.5) * 1024 * 1024;

const SUCCESS = "<:CekMark:1564402704921534514>";
const FAIL = "<:Xmark:1564402706800713818>";
const GIF_URL =
"https://cdn.imageurlgenerator.com/uploads/f7af7a46-43d6-4f70-89c0-b4ff901382a0.gif";

const RED = 0xE53935;
const BLACK = 0x111111;
const reports = new Map();

if (!TOKEN) {
console.error("Missing DISCORD_TOKEN. Add it to your .env file.");
process.exit(1);
}

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
]
});

function loadingEmbed(lines) {
return new EmbedBuilder()
.setColor(BLACK)
.setTitle("Processing")
.setDescription(lines.join("\n"))
.setImage(GIF_URL);
}

function helpEmbed() {
return new EmbedBuilder()
.setColor(BLACK)
.setTitle("Hyperion Deobfuscator | Help")
.setDescription(
"Commands\n" +
"".luraph" — Detect and process supported Luraph versions.\n" +
"".prom" — Process Prometheus scripts.\n" +
"".msec" — Process MoonSec V3 scripts.\n" +
"".deobf" — Automatically detect a supported obfuscator.\n" +
"".help" — Show this help message.\n\n" +
"Attach a ".lua", ".luau", or ".txt" file to your command."
);
}

function failureEmbed(user, elapsed, error) {
return new EmbedBuilder()
.setColor(RED)
.setTitle("Error")
.setDescription(
"Obfuscation Failed ${user}\n" +
"Unsupported obfuscator or backend error. Report it to the owner?"
)
.addFields(
{
name: "Elapsed",
value: "${(elapsed / 60000).toFixed(2)} minutes",
inline: true
},
{
name: "Details",
value: "\"``text\n${String(error).slice(0, 800)}\n````
}
);
}

function reportButton(id) {
return new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("report:${id}")
.setLabel("Report Error")
.setStyle(ButtonStyle.Danger)
);
}

async function readInput(message, args) {
const attachment = message.attachments.find(file =>
/.(lua|luau|txt)$/i.test(file.name || "")
);

if (attachment) {
if (attachment.size > MAX_BYTES) {
throw new Error(
"File exceeds the ${(MAX_BYTES / 1048576).toFixed(1)} MB limit."
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
  throw new Error("Downloaded file exceeds the configured size limit.");
}

return {
  source: buffer.toString("utf8"),
  filename: attachment.name || "input.lua"
};

}

const source = args.trim();

if (!source) {
throw new Error("Attach a Lua/Luau file or put source text after the command.");
}

if (Buffer.byteLength(source, "utf8") > MAX_BYTES) {
throw new Error("Source exceeds the configured size limit.");
}

return { source, filename: "input.lua" };
}

function getDetection(command, source) {
if (command === "luraph") return detectLuraphVersion(source);
if (command === "prom") return detectPrometheus(source);
if (command === "msec") return detectMoonsec(source);
return detectAny(source);
}

function backendName(detection) {
if (detection.type === "luraph") return "Luraph v${detection.version}";
if (detection.type === "prom") return "Prometheus";
return "MoonSec V3";
}

async function processCommand(message, command, args) {
const started = Date.now();
let tempDir;

try {
const { source, filename } = await readInput(message, args);

const processingMessage = await message.reply({
  embeds: [
    loadingEmbed([
      ":hourglass_flowing_sand: Detecting Obfuscator",
      ":hourglass_flowing_sand: Wrapping the lines",
      ":hourglass_flowing_sand: Deobfuscating"
    ])
  ]
});

const detection = getDetection(command, source);

if (!detection) {
  throw new Error("Unknown obfuscator. Processing stopped without running a backend.");
}

if (command === "prom" && detection.type !== "prom") {
  throw new Error("This source was not detected as Prometheus.");
}

if (command === "msec" && detection.type !== "msec") {
  throw new Error("This source was not detected as MoonSec V3.");
}

if (command === "luraph" && detection.type !== "luraph") {
  throw new Error("This source was not detected as Luraph.");
}

if (detection.type === "luraph" && detection.version === "15.1") {
  throw new Error("Luraph v15.1 is detected, but its specific backend has not been added.");
}

await processingMessage.edit({
  embeds: [
    loadingEmbed([
      `${SUCCESS} Detected: ${backendName(detection)}`,
      ":hourglass_flowing_sand: Wrapping the lines",
      ":hourglass_flowing_sand: Deobfuscating"
    ])
  ]
});

tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "hyperion-"));
const inputPath = path.join(tempDir, "input.lua");
const outputPath = path.join(tempDir, "deobfuscated.lua");

// Normalize line endings only; avoid risky automatic rewriting of Lua syntax.
const normalized = source.replace(/\r\n?/g, "\n");
await fs.writeFile(inputPath, normalized, "utf8");

await processingMessage.edit({
  embeds: [
    loadingEmbed([
      `${SUCCESS} Detected: ${backendName(detection)}`,
      `${SUCCESS} Wrapping Lines Complete`,
      ":hourglass_flowing_sand: Deobfuscating"
    ])
  ]
});

await deobfuscate(detection.type, inputPath, outputPath, detection.version);

const output = await fs.readFile(outputPath);

if (!output.length) {
  throw new Error("Backend produced an empty output file.");
}

const elapsed = Date.now() - started;

await processingMessage.edit({
  embeds: [
    new EmbedBuilder()
      .setColor(0x2E7D32)
      .setTitle("Deobfuscation Complete")
      .setDescription(
        `${SUCCESS} Detected: ${backendName(detection)}\n` +
        `${SUCCESS} Wrapping Lines Complete\n` +
        `${SUCCESS} Deobfuscation Complete`
      )
      .setImage(GIF_URL)
      .addFields({
        name: "Elapsed",
        value: `${(elapsed / 60000).toFixed(2)} minutes`
      })
  ],
  files: [
    new AttachmentBuilder(output, {
      name: `${path.parse(filename).name}.deobfuscated.lua`
    })
  ]
});

} catch (error) {
const elapsed = Date.now() - started;
const id = crypto.randomBytes(8).toString("hex");

reports.set(id, {
  userId: message.author.id,
  userTag: message.author.tag,
  command: `${PREFIX}${command}`,
  messageUrl: message.url,
  error: String(error.message || error).slice(0, 1200),
  elapsed
});

const old = setTimeout(() => reports.delete(id), 86400000);
old.unref?.();

await message.reply({
  embeds: [failureEmbed(message.author, elapsed, error.message || error)],
  components: [reportButton(id)]
}).catch(console.error);

console.error(`[${command}]`, error);

} finally {
if (tempDir) {
await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
}
}
}

client.on("messageCreate", async message => {
if (message.author.bot || !message.content.startsWith(PREFIX)) return;

const body = message.content.slice(PREFIX.length).trim();
const split = body.search(/\s/);
const command = (split === -1 ? body : body.slice(0, split)).toLowerCase();
const args = split === -1 ? "" : body.slice(split + 1);

if (command === "help") {
await message.reply({ embeds: [helpEmbed()] });
return;
}

if (["luraph", "prom", "msec", "deobf"].includes(command)) {
await processCommand(message, command, args);
}
});

client.on("interactionCreate", async interaction => {
if (!interaction.isButton() || !interaction.customId.startsWith("report:")) return;

const id = interaction.customId.slice("report:".length);
const report = reports.get(id);

if (!report) {
await interaction.reply({
content: "This report has expired.",
ephemeral: true
});
return;
}

if (interaction.user.id !== report.userId) {
await interaction.reply({
content: "Only the user who ran the command can report this error.",
ephemeral: true
});
return;
}

await interaction.deferReply({ ephemeral: true });

try {
const owner = await client.users.fetch(OWNER_ID);

await owner.send({
  embeds: [
    new EmbedBuilder()
      .setColor(RED)
      .setTitle("Deobfuscator Error Report")
      .addFields(
        { name: "Reporter", value: `${report.userTag} (${report.userId})` },
        { name: "Command", value: report.command, inline: true },
        {
          name: "Elapsed",
          value: `${(report.elapsed / 60000).toFixed(2)} minutes`,
          inline: true
        },
        { name: "Message", value: report.messageUrl },
        { name: "Error", value: report.error }
      )
      .setFooter({ text: "Submitted source code is not included." })
  ]
});

await interaction.editReply("Error report sent to the owner.");

} catch (error) {
console.error("Could not send report:", error);
await interaction.editReply("Could not DM the owner. Check their DM settings and ID.");
}
});

client.once("ready", () => {
console.log("Logged in as ${client.user.tag}");
console.log("Commands: .luraph, .prom, .msec, .deobf, .help");
});

client.login(TOKEN);