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

const PREMIUM_ROLE_ID = "1559111360615284806"; // Premium Role ID

const DATA_FILE = "bot_data.json";

// --- DATABASE HELPERS ---
function loadData() {
    if (!fs.existsSync(DATA_FILE)) {
        return { users: {}, blacklist: [] };
    }
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        return { users: {}, blacklist: [] };
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
    const key = Math.floor(Math.random() * 200) + 20;
    
    const rName = () => "_" + Math.random().toString(36).substring(2, 9);
    const vEnv = rName();
    const vDec = rName();
    const vData = rName();
    const vRes = rName();
    const vFn = rName();
    const vSuccess = rName();
    const vCompiled = rName();
    
    const encodedBytes = [];
    for (let i = 0; i < minified.length; i++) {
        encodedBytes.push((minified.charCodeAt(i) + key) % 256);
    }
    const encodedStr = encodedBytes.join(',');
    const watermark = "-- Obfuscated by HyperionV1 [{https://discord.gg/9wJs5bwxRz}]";
    
    const vmStub = `local ${vEnv}=(getfenv and getfenv(0))or _G;local function ${vDec}(...)local t={...};local r={};for i=1,#t do r[i]=string.char((t[i]-${key})%256)end;return table.concat(r);end;local ${vData}={${encodedStr}};local ${vRes}=${vDec}(unpack(${vData})or table.unpack(${vData}));local ${vFn}=loadstring or load;if ${vFn} then local ${vSuccess},${vCompiled}=pcall(${vFn},${vRes});if ${vSuccess} and type(${vCompiled})=="function" then return ${vCompiled}()else error("Hyperion Anti-Tamper: Execution failed.")end;end;`;

    return `${watermark}\n${vmStub}`;
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

// --- REGISTER ALL SLASH COMMANDS ---
const commands = [
    new SlashCommandBuilder().setName('help').setDescription('Sends the Hyperion help panel'),
    new SlashCommandBuilder().setName('daily').setDescription('Claim your daily credits (25 for normal, 100 for premium)'),
    new SlashCommandBuilder().setName('balance').setDescription('Check your current credit balance'),
    new SlashCommandBuilder().setName('leaderboard').setDescription('Shows the top 10 users with the most credits'),
    new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Transfer credits to another user')
        .addIntegerOption(option => option.setName('amount').setDescription('Amount of credits to transfer').setRequired(true))
        .addUserOption(option => option.setName('user').setDescription('User to receive the credits').setRequired(true)),
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Obfuscates your file or pasted code (Costs 2 credits)')
        .addStringOption(option => option.setName('code').setDescription('Pasted Lua code').setRequired(false))
        .addAttachmentOption(option => option.setName('file').setDescription('Lua file attachment').setRequired(false)),
    new SlashCommandBuilder()
        .setName('minify')
        .setDescription('Minifies your file or pasted code (Costs 2 credits)')
        .addStringOption(option => option.setName('code').setDescription('Pasted Lua code').setRequired(false))
        .addAttachmentOption(option => option.setName('file').setDescription('Lua file attachment').setRequired(false))
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('Registering slash commands...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Successfully registered all application slash commands!');
    } catch (error) {
        console.error('Error registering slash commands:', error);
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
                                "/Daily : Gives you 25 credits\n" +
                                "/Balance : checks your credits\n" +
                                "/Transfer <amount> <user> : Transfers credits to another user\n" +
                                "/Leaderboard : Shows a embed of the users that has the most credits")
                .setColor(0x2f3136);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`help_commands_${userId}`).setLabel('Commands').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`help_owner_${userId}`).setLabel('Owner').setStyle(ButtonStyle.Secondary)
            );

            // FIXED: Added components: [row] back here!
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
                await interaction.reply({ content: `⏳ You must wait **${hours}h ${minutes}m** before claiming your daily credits again.`, ephemeral: true });
                return;
            }

            const hasPremiumRole = interaction.member && interaction.member.roles.cache.has(PREMIUM_ROLE_ID);
            const reward = hasPremiumRole ? 100 : 25;

            userData.users[userId].credits += reward;
            userData.users[userId].last_daily = currentTime;
            saveData(userData);

            await interaction.reply({ content: `✅ You successfully claimed your daily **${reward} credits**!`, ephemeral: true });
        }
        else if (interaction.commandName === 'balance') {
            const userData = getUser(userId);
            const credits = userData.users[userId].credits;
            await interaction.reply({ content: `💰 You currently have **${credits} credits**.`, ephemeral: true });
        }
        else if (interaction.commandName === 'transfer') {
            const amount = interaction.options.getInteger('amount');
            const targetUser = interaction.options.getUser('user');

            if (amount <= 0) {
                await interaction.reply({ content: "❌ You must transfer a positive amount of credits.", ephemeral: true });
                return;
            }

            if (targetUser.id === userId) {
                await interaction.reply({ content: "❌ You cannot transfer credits to yourself.", ephemeral: true });
                return;
            }

            if (targetUser.bot) {
                await interaction.reply({ content: "❌ You cannot transfer credits to a bot.", ephemeral: true });
                return;
            }

            const userData = getUser(userId);
            const senderCredits = userData.users[userId].credits;

            if (senderCredits < amount) {
                await interaction.reply({ content: `❌ You do not have enough credits! Your current balance is **${senderCredits} credits**.`, ephemeral: true });
                return;
            }

            getUser(targetUser.id);
            userData.users[userId].credits -= amount;
            userData.users[targetUser.id].credits += amount;
            saveData(userData);

            await interaction.reply({ content: `💸 Successfully transferred **${amount} credits** to ${targetUser.toString()}!` });
        }
        else if (interaction.commandName === 'leaderboard') {
            const users = data.users || {};
            
            const sortedUsers = Object.entries(users)
                .sort(([, a], [, b]) => b.credits - a.credits)
                .slice(0, 10);

            let description = "";
            if (sortedUsers.length === 0) {
                description = "No users found on the leaderboard yet.";
            } else {
                let rank = 1;
                for (const [uid, uData] of sortedUsers) {
                    description += `${rank}. <@${uid}> Credits = ${uData.credits}\n`;
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

            const attachment = new AttachmentBuilder(Buffer.from(output, 'utf-8'), { name: isObf ? 'obfuscated.lua' : 'minified.lua' });
            const responseText = `•──────⋅☾⚒️☽⋅──────•\n**${titleMsg}**\n**🖤 • Thx for using Hyperion**\n•──────⋅☾⚒️☽⋅──────•`;
            await interaction.reply({ content: responseText, files: [attachment] });
        }
    } 
    else if (interaction.isButton()) {
        if (!interaction.customId.startsWith('help_')) return;
        const parts = interaction.customId.split('_');
        const type = parts[1];   
        const ownerId = parts[2]; 

        if (interaction.user.id !== ownerId) {
            await interaction.reply({ content: "❌ You cannot use this help menu because you didn't run the command!", ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder();
        if (type === 'commands') {
            embed.setTitle("*** Help Menu***")
                 .setDescription("***Commands***\n" +
                                 "/Obfuscate : Obfuscates your file/pasted code\n" +
                                 "/Minify : Minifys your file/pasted code\n" +
                                 "/Help : sends this help panel \n" +
                                 "/Daily : Gives you 25 credits\n" +
                                 "/Balance : checks your credits\n" +
                                 "/Transfer <amount> <user> : Transfers credits to another user\n" +
                                 "/Leaderboard : Shows a embed of the users that has the most credits")
                 .setColor(0x2f3136);
            await interaction.update({ embeds: [embed] });
        } else if (type === 'owner') {
            embed.setTitle("**👑Owner Only**")
                 .setDescription("**Commands**\n" +
                                 ".credit <number> <user> : Gives a user credit\n" +
                                 ".delcre <number> <user> : Deletes an amount of credit from a selected user (can go in debt)\n" +
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

    const ownerCommands = ['credit', 'delcre', 'blacklist', 'unblacklist', 'ping', 'premium'];
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
        else if (command === 'delcre') {
            const amount = parseInt(args[0]);
            const member = message.mentions.members.first();
            if (isNaN(amount) || amount <= 0 || !member) {
                await message.channel.send("❌ Usage: `.delcre <number> @user`");
                return;
            }
            const userData = getUser(member.id);
            
            userData.users[member.id].credits -= amount;
            const newCredits = userData.users[member.id].credits;
            saveData(userData);

            await message.channel.send(`✅ Removed **${amount} credits** from ${member.toString()}. New Balance: **${newCredits} credits**.`);
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
            
            try {
                if (member.roles.cache.has(PREMIUM_ROLE_ID)) {
                    await member.roles.remove(PREMIUM_ROLE_ID);
                    await message.channel.send(`❌ Removed Premium role <@&${PREMIUM_ROLE_ID}> from ${member.toString()}.`);
                } else {
                    await member.roles.add(PREMIUM_ROLE_ID);
                    await message.channel.send(`👑 Granted Premium role <@&${PREMIUM_ROLE_ID}> to ${member.toString()}! (Daily reward upgraded to 100 credits).`);
                }
            } catch (err) {
                console.error("Error giving role:", err);
                await message.channel.send("❌ Failed to modify user roles. Make sure the bot's role is positioned ABOVE the Premium role in Server Settings -> Roles!");
            }
        }
    }
});

client.login(TOKEN);