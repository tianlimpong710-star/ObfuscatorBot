const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ] });

const PREFIX = ".";

// Hex encoder matching your VM's _S decoder function
function hexEncode(str, key = 0x5A) { 
    let hex = ""; 
    for (let i = 0; i < str.length; i++) { 
        const b = str.charCodeAt(i) ^ key; 
        hex += b.toString(16).padStart(2, '0'); 
    } 
    return hex; 
}

// HyperionV1 Obfuscation Logic
function obfuscateLua(sourceCode) { 
    const watermark = "-- Protected by HyperionV1 | https://discord.gg/9wJs5bwxRz\n"; 
    const vmStub = "do local _ENV=getfenv and getfenv()or _ENV local V={pc=1,S={},R={},C={},halt=false}local function P(x)V.S[#V.S+1]=x end local function O()local n=#V.S;local x=V.S[n];V.S[n]=nil;return x end local function _S(h,k)local t={}for i=1,#h,2 do local b=tonumber(h:sub(i,i+1),16)t[#t+1]=string.char(bit32 and bit32.bxor(b,k)or(b\\~k))end return table.concat(t)end local OP={}OP[0x01]=function()P(true)end OP[0x10]=function()local f=O()if type(f)==\"function\"then local ok=pcall(f)if not ok then error(_S(\"12232a3f283335347a33342e3f3d28332e237a39323f39317a3c3b33363f3e\",0x5A),0)end end end;";

    const encodedSource = hexEncode(sourceCode, 0x5A);
    const payloadWrapper = `local run=loadstring or load;local code=_S("${encodedSource}",0x5A);local fn=run(code);if fn then fn() end`;
    return watermark + vmStub + " " + payloadWrapper + "\nend";
}

client.on('ready', () => { 
    console.log(`Logged in as ${client.user.tag}!`); 
});

client.on('messageCreate', async (message) => { 
    if (message.author.bot) return;

    if (message.content.startsWith(`${PREFIX}obfuscate`)) {
        const args = message.content.slice(PREFIX.length + 10).trim();
        
        if (!args) {
            return message.reply("Please provide the Lua script you want to obfuscate! Usage: `.obfuscate print('Hello World')`");
        }
        try {
            const protectedCode = obfuscateLua(args);
            const buffer = Buffer.from(protectedCode, 'utf-8');
            const file = new AttachmentBuilder(buffer, { name: 'protected.lua' });
            
            const responseText = 
                "✦•┈┈┈┈๑⋅⋯⋅⋯ ⋅⋯⋯⋅๑┈┈┈┈•✦\n" +
                "**✅ • Output successfully Generated**\n" +
                "**⚒️ • Thx for using HyperionBot**\n" +
                "✦•┈┈┈┈๑⋅⋯⋅⋯ ⋅⋯⋯⋅๑┈┈┈┈•✦\n";
                
            await message.channel.send({
                content: responseText,
                files: [file]
            });
        } catch (error) {
            console.error(error);
            await message.channel.send("An error occurred while obfuscating the script.");
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
