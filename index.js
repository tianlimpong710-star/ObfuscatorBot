const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    AttachmentBuilder 
} = require('discord.js');
const fs = require('fs');

// --- CONFIGURATION ---
const TOKEN = process.env.DISCORD_TOKEN || "YOUR_BOT_TOKEN_HERE";
const CLIENT_ID = process.env.CLIENT_ID || "YOUR_CLIENT_ID_HERE";
const PRIMARY_OWNER_ID = "123456789012345678"; // Replace with your main Discord User ID

const ALLOWED_ROLE_IDS = [
    "1552940976236929024",
    "1552940976165888039",
    "1552940976165888037"
];

const DATA_FILE = "bot_data.json";

// --- DATABASE HELPERS ---
function loadData() {
    if (!fs.existsSync(DATA_FILE)) {
        return { users: {}, blacklist: [], premium: [] };
    }
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        return { users: {}, blacklist: [], premium: [] };
    }
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4));
}

function getUser(userId) {
    const data = loadData();
    if (!data.users[userId]) {
        data.users[userId] = { credits: 10, last_daily: 0 };
        saveData(data);
    }
    return data;
}

// --- OWNER & ROLE CHECK ---
function hasOwnerOrRole(member) {
    if (!member) return false;
    if (member.id === PRIMARY_OWNER_ID) return true;
    return member.roles.cache.some(role => ALLOWED_ROLE_IDS.includes(role.id));
}

// --- LUA MINIFIER & OBFUSCATOR ENGINE ---
function minifyLua(code) {
    code = code.replace(/--\[\[[\s\S]*?\]\]/g, '');
    code = code.replace(/--[^\r\n]*/g, '');
    const lines = code.split(/\r?\n/);
    const cleaned = lines.map(l => l.trim()).filter(l => l.length > 0);
    return cleaned.join('\n');
}

function obfuscateLua(code) {
    const minified = minifyLua(code);
    const key = Math.floor(Math.random() * 240) + 10;
    
    const encodedBytes = [];
    for (let i = 0; i < minified.length; i++) {
        encodedBytes.push((minified.charCodeAt(i) + key) % 256);
    }
    const encodedStr = encodedBytes.join(',');
    const watermark = "-- Obfuscated by HyperionV1 [{https://discord.gg/9wJs5bwxRz}]";
    
    const vmStub = `${watermark}
local _env = (getfenv and getfenv(0)) or _G
local function _decrypt(...)
    local args = {...}
    local res = {}
    for i = 1, #args do
        res[i] = string.char((args[i] - ${key}) % 256)
    end
    return table.concat(res)
end

local _payload = {${encodedStr}}
local _rawCode = _decrypt(unpack(_payload) or table.unpack(_payload))
local _fn, _err = loadstring or load
if _fn then
    local success, compiled = pcall(_fn, _rawCode)
    if success and type(compiled) == "function" then
        return compiled()
    else
        error("Hyperion Anti-Tamper: Execution failed.")
    end
end`;

    return vmStub.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0).join('\n');
}

// --- CLIENT SETUP ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// --- REGISTER SLASH COMMANDS ---
const commands = [
    new SlashCommandBuilder().setName('help').setDescription('Sends the Hyperion help panel'),
    new SlashCommandBuilder().setName('daily').setDescription('Claim your daily credits (25 for normal, 100 for premium)'),
    new SlashCommandBuilder().setName('balance').setDescription('Check your current credit balance'),
    new SlashCommandBuilder().setName('leaderboard').setDescription('Shows the top 10 users with the most credits'),
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Obfuscates your Lua file or pasted code (Costs 2 credits)')
        .addStringOption(option => option.setName('code').setDescription('Pasted Lua code').setRequired(false))
        .addAttachmentOption(option => option.setName('file').setDescription('Lua file attachment').setRequired(false)),
    new SlashCommandBuilder()
        .setName('minify')
        .setDescription('Minifies your Lua file or pasted code (Costs 2 credits)')
        .addStringOption(option => option.setName('code').setDescription('Pasted Lua code').setRequired(false))
        .addAttachmentOption(option => option.setName('file').setDescription('Lua file attachment').setRequired(false))
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Successfully registered application slash commands.');
    } catch (error) {
        console.error(error);
    }
});

// --- INTERACTIONS & COMMANDS ---
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const data = loadData();
        const userId = interaction.user.id;

        if (data.blacklist && data.blacklist.includes(userId)) {
            await interaction.reply({ content: "❌ You are blacklisted from using this bot.", ephemeral: true });
            return;
        }

        if (interaction.commandName === 'help') {
            const embed = new EmbedBuilder()
                .setTitle("*** Help Menu***")
                .setDescription("***Commands***\n" +
                                "/Obfuscate : Obfuscates your file/pasted code\n" +
                                "/Minify : Minifys your file/pasted code\n" +
                                "/Help : sends this help panel \n" +
                                "/Daily : Gives you 25 credits")
                .setColor(0x2f3136);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('help_commands').setLabel('Commands').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('help_owner').setLabel('Owner').setStyle(ButtonStyle.Secondary)
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        } 
        else if (interaction.commandName === 'daily') {
            const userData = getUser(userId);
            const currentTime = Date.now() / 1000;
            const cooldown = 86400; // 24 hours

            const lastClaimed = userData.users[userId].last_daily;
            if (currentTime - lastClaimed < cooldown) {
                const remaining = Math.floor(cooldown - (currentTime - lastClaimed));
                const hours = Math.floor(remaining / 3600);
                const minutes = Math.floor((remaining % 3600) / 60);
                await interaction.reply({ content: `⏳ You must wait **{hours}h {minutes}m** before claiming your daily credits again.`.replace('{hours}', hours).replace('{minutes}', minutes), ephemeral: true });
                return;
            }

            const isPremium = data.premium && data.premium.includes(userId);
            const reward = isPremium ? 100 : 25;

            userData.users[userId].credits += reward;
            userData.users[userId].last_daily = currentTime;
            saveData(userData);

            await interaction.reply({ content: `✅ You successfully claimed your daily **{reward} credits**!`.replace('{reward}', reward), ephemeral: true });
        }
        else if (interaction.commandName === 'balance') {
            const userData = getUser(userId);
            const credits = userData.users[userId].credits;
            await interaction.reply({ content: `💰 You currently have **{credits} credits**.`.replace('{credits}', credits), ephemeral: true });
        }
        else if (interaction.commandName === 'leaderboard') {
            const users = data.users || {};
            
            // Sort users by credits in descending order (highest first)
            const sortedUsers = Object.entries(users)
                .sort(([, a], [, b]) => b.credits - a.credits)
                .slice(0, 10); // Limit to top 10

            let description = "";
            if (sortedUsers.length === 0) {
                description = "No users found on the leaderboard yet.";
            } else {
                let rank = 1;
                for (const [uid, uData] of sortedUsers) {
                    description += `${rank}. <@${uid}> Credits =${uData.credits}\n`;
                    rank++;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle("**LeaderBoard**")
                .setDescription(description)
                .setColor(0xffd700);

            await interaction.reply({ embeds: [embed] });
        }
        else if (interaction.commandName === 'obfuscate' || interaction.commandName === 'minify') {
            const userData = getUser(userId);
            if (userData.users[userId].credits < 2) {
                await interaction.reply({ content: "❌ **Access Denied:** You need at least **2 credits** to use this command. Use `/daily` to get credits!", ephemeral: true });
                return;
            }

            const codeOpt = interaction.options.getString('code');
            const fileOpt = interaction.options.getAttachment('file');
            let luaCode = "";

            if (fileOpt) {
                if (!fileOpt.name.endsWith('.lua')) {
                    await interaction.reply({ content: "❌ Please upload a valid `.lua` file.", ephemeral: true });
                    return;
                }
                try {
                    const response = await fetch(fileOpt.url);
                    luaCode = await response.text();
                } catch (e) {
                    await interaction.reply({ content: "❌ Failed to read the attached file.", ephemeral: true });
                    return;
                }
            } else if (codeOpt) {
                luaCode = codeOpt;
            } else {
                await interaction.reply({ content: "❌ Please provide either pasted code or attach a Lua file.", ephemeral: true });
                return;
            }

            userData.users[userId].credits -= 2;
            saveData(userData);

            const isObf = interaction.commandName === 'obfuscate';
            const output = isObf ? obfuscateLua(luaCode) : minifyLua(luaCode);
            const titleMsg = isObf ? "✅ • Obfuscation Sucsess" : "✅ • Minification Sucsess";

            if (output.length > 1800) {
                const attachment = new AttachmentBuilder(Buffer.from(output, 'utf-8'), { name: isObf ? 'obfuscated.lua' : 'minified.lua' });
                const responseText = `•──────⋅☾⚒️☽⋅──────•\n**${titleMsg}**\n**🖤 • Thx for using Hyperion**\n•──────⋅☾⚒️☽⋅──────•\n*Output file attached due to character limits.*`;
                await interaction.reply({ content: responseText, files: [attachment] });
            } else {
                const responseText = `•──────⋅☾⚒️☽⋅──────•\n**${titleMsg}**\n**🖤 • Thx for using Hyperion**\n•──────⋅☾⚒️☽⋅──────•\n\`\`\`lua\n${output}\n\`\`\``;
                await interaction.reply({ content: responseText });
            }
        }
    } 
    else if (interaction.isButton()) {
        const embed = new EmbedBuilder();
        if (interaction.customId === 'help_commands') {
            embed.setTitle("*** Help Menu***")
                 .setDescription("***Commands***\n" +
                                 "/Obfuscate : Obfuscates your file/pasted code\n" +
                                 "/Minify : Minifys your file/pasted code\n" +
                                 "/Help : sends this help panel \n" +
                                 "/Daily : Gives you 25 credits")
                 .setColor(0x2f3136);
            await interaction.update({ embeds: [embed] });
        } else if (interaction.customId === 'help_owner') {
            embed.setTitle("**👑Owner Only**")
                 .setDescription("**Commands**\n" +
                                 ".credit <number> <user> : Gives a user credit\n" +
                                 ".blacklist <user> : Blacklits a user so they cant use the bot\n" +
                                 ".unblacklist <user> : Unblacklists a user\n" +
                                 ".ping : Checks the ping of the bot\n" +
                                 ".premium <user> : Gives user premium improved daily now getting 100 credits from the /daily")
                 .setColor(0xffd700);
            await interaction.update({ embeds: [embed] });
        }
    }
});

// --- PREFIX COMMANDS (OWNER / ROLE ONLY) ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith('.')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    const ownerCommands = ['credit', 'blacklist', 'unblacklist', 'ping', 'premium'];
    if (ownerCommands.includes(command)) {
        if (!hasOwnerOrRole(message.member)) {
            await message.reply("❌ **Access Denied:** You do not have the required Role to run owner commands.");
            return;
        }

        const data = loadData();

        if (command === 'ping') {
            const latency = Math.round(client.ws.ping);
            await message.channel.send(`🏓 Pong! Latency: **${latency}ms**`);
        }
        else if (command === 'credit') {
            const amount = parseInt(args[0]);
            const member = message.mentions.members.first();
            if (isNaN(amount) || !member) {
                await message.channel.send("❌ Usage: `.credit <number> @user`");
                return;
            }
            const userData = getUser(member.id);
            userData.users[member.id].credits += amount;
            saveData(userData);
            await message.channel.send(`✅ Added **${amount} credits** to ${member.toString()}.`);
        }
        else if (command === 'blacklist') {
            const member = message.mentions.members.first();
            if (!member) {
                await message.channel.send("❌ Usage: `.blacklist @user`");
                return;
            }
            if (!data.blacklist) data.blacklist = [];
            const uid = member.id;
            if (!data.blacklist.includes(uid)) {
                data.blacklist.push(uid);
                saveData(data);
                await message.channel.send(`✅ Blacklisted ${member.toString()}.`);
            } else {
                await message.channel.send(`❌ ${member.toString()} is already blacklisted.`);
            }
        }
        else if (command === 'unblacklist') {
            const member = message.mentions.members.first();
            if (!member) {
                await message.channel.send("❌ Usage: `.unblacklist @user`");
                return;
            }
            if (!data.blacklist) data.blacklist = [];
            const uid = member.id;
            const index = data.blacklist.indexOf(uid);
            if (index > -1) {
                data.blacklist.splice(index, 1);
                saveData(data);
                await message.channel.send(`✅ Unblacklisted ${member.toString()}.`);
            } else {
                await message.channel.send(`❌ ${member.toString()} is not on the blacklist.`);
            }
        }
        else if (command === 'premium') {
            const member = message.mentions.members.first();
            if (!member) {
                await message.channel.send("❌ Usage: `.premium @user`");
                return;
            }
            if (!data.premium) data.premium = [];
            const uid = member.id;
            const index = data.premium.indexOf(uid);
            if (index > -1) {
                data.premium.splice(index, 1);
                await message.channel.send(`❌ Removed premium status from ${member.toString()}.`);
            } else {
                data.premium.push(uid);
                await message.channel.send(`👑 Granted premium status to ${member.toString()} (Daily reward upgraded to 100 credits).`);
            }
            saveData(data);
        }
    }
});

client.login(TOKEN);
                                                                                                     
