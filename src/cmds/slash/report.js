const { SlashCommandBuilder, userMention, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js'); 
const { pool } = require('../../../config/config');
const { reportInternalError } = require('../../services/reportErrorService');
const DEV_ID = '1368556179600445531';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Report an issue to the developer (abuse may lead to a blacklist)')
        .addStringOption(option =>
            option
                .setName('error_type')
                .setDescription('Type of issue to report')
                .setRequired(true)
                .addChoices(
                    { name: 'Bug', value: 'bug' },
                    { name: 'Suggestion', value: 'suggestion' },
                    { name: 'Language issue', value: 'language_error' },
                    { name: 'Other', value: 'other' }
                )
        )
        .addStringOption(option =>
            option
                .setName('error_details')
                .setDescription('Details of the issue to report')
                .setRequired(true)
        ),
    async execute(interaction) {
        try {
            const blacklistResult = await pool.query(
                'SELECT * FROM blacklist WHERE user_id = $1',
                [interaction.user.id]
            );

            if (blacklistResult.rows.length > 0) {
                const embed = new EmbedBuilder()
                    .setTitle('You are blacklisted and cannot use this command.')
                    .setColor(0xED4245);
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const client = interaction.client;
            const devUser = await client.users.fetch(DEV_ID);
            const date = new Date().toLocaleString('en-US', { 
                dateStyle: 'full', 
                timeStyle: 'short' 
            });
            const errorType = interaction.options.getString('error_type');
            const errorDetails = interaction.options.getString('error_details');

            // Error type display names and emojis
            const typeLabels = {
                'bug': '🐛 Bug',
                'suggestion': '💡 Suggestion',
                'language_error': '🌍 Language issue',
                'other': '📝 Other'
            };

            const typeColors = {
                'bug': 0xED4245,          // Red
                'suggestion': 0x57F287,    // Green
                'language_error': 0x5865F2, // Blurple
                'other': 0xFEE75C          // Yellow
            };

            const embed = new EmbedBuilder()
                .setTitle('📋 New Report')
                .setColor(typeColors[errorType] || 0x5865F2)
                .setDescription(`A new report has been submitted by ${userMention(interaction.user.id)}`)
                .addFields(
                    { 
                        name: '📌 Report type', 
                        value: typeLabels[errorType] || errorType,
                        inline: true 
                    },
                    { 
                        name: '👤 User', 
                        value: `${interaction.user.tag}\n(${interaction.user.id})`,
                        inline: true 
                    },
                    { 
                        name: '🏠 Server', 
                        value: interaction.guild ? `${interaction.guild.name}\n(${interaction.guild.id})` : 'DM',
                        inline: true 
                    },
                    { 
                        name: '📝 Details', 
                        value: `\`\`\`${errorDetails}\`\`\``,
                        inline: false 
                    }
                )
                .setFooter({ text: `RudyProtect • ${date}` })
                .setTimestamp();

            //ajout des boutons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('View User')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://discord.com/users/${interaction.user.id}`)
                )
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Server invite')
                        .setStyle(ButtonStyle.Link)
                        .setURL(interaction.guild ? await interaction.guild.invites.create(interaction.channel.id, { maxAge: 0, maxUses: 1 }).then(invite => invite.url).catch(() => 'No invite available') : 'No invite available') 
                )
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Blacklist user')
                        .setStyle(ButtonStyle.Danger)
                        .setCustomId(`blacklist_${interaction.user.id}`)
                )
            await devUser.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: 'Thanks for your report! We will review it as soon as possible.', ephemeral: true });

        } catch (error) {
            console.error('Error in /report command:', error);
            
            // Automatically report the error to the developer
            await reportInternalError(interaction.client, error, {
                commandName: 'report',
                user: interaction.user,
                guild: interaction.guild,
                channel: interaction.channel
            });
            
            await interaction.reply({ content: `**An error occurred, please contact @${DEV_ID}**`, ephemeral: true });
        }
    }
  };
