const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Support Embed Structure
const supportEmbed = new EmbedBuilder()
    .setTitle('**Supported Obfuscators**')
    .setColor(0x00FF00) // Green
    .setDescription([
        '• Promothemius/Wearedevs',
        '• MoonsecV3',
        '• Moonveil 1.4.5',
        '• Moonveil 2.0.0',
        '• Luraph 15'
    ].join('\n'));

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Message Command Handler (Prefix '.')
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const prefix = '.';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // 1. .support Command
    if (commandName === 'support') {
        try {
            await message.channel.send({ embeds: [supportEmbed] });
        } catch (error) {
            console.error('Error sending support embed:', error);
        }
    }
    
    // 2. .deobfuscate Command
    else if (commandName === 'deobfuscate') {
        const targetScript = args[0];
        if (!targetScript) {
            return message.channel.send('⚠️ Please provide a script or code to deobfuscate.');
        }
        
        await message.channel.send('🔄 Deobfuscating Lua obfuscator... Please wait.');
        // TODO: Insert your backend deobfuscation logic or API integration here
    }
    
    // 3. Command to trigger the Help Menu with the "Skid" Button
    else if (commandName === 'help') {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_button_1')
                    .setLabel('General')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('help_button_2')
                    .setLabel('Tools')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('help_button_3_skid')
                    .setLabel('Skid')
                    .setStyle(ButtonStyle.Success) // Green button style for Skid
            );

        await message.channel.send({
            content: 'Select a category from the help menu below:',
            components: [row]
        });
    }
});

// Button Interaction Handler (For Button 3: "Skid")
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'help_button_3_skid') {
        await interaction.reply({
            content: '**Skid Menu & Commands:**\n' +
                     '• `.deobfuscate` : Deobfuscates a lua obfuscator\n' +
                     '• `.support` : Sends out an embed full of supported lua obfuscators',
            ephemeral: true // Set to true if you only want the user clicking it to see the response
        });
    }
});

// Replace with your actual bot token
client.login('YOUR_BOT_TOKEN_HERE');
