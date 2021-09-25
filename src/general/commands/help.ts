import { Embed, SlashCommandBuilder, userMention } from '@discordjs/builders';
import { ApplicationCommandPermissionData, ButtonInteraction, CommandInteraction, Interaction, MessageActionRow, MessageButton, MessageComponent, MessageComponentCollectorOptions, MessageComponentInteraction, MessageEmbed, MessageSelectMenu, MessageSelectMenuOptions } from 'discord.js';
import { EmbedColor, inboxLinkButton } from '../general/util'

export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('help')
    .addStringOption(option => option.setName('command_name').setDescription('Command to get more info on.').setRequired(false))
    .setDescription('Look up available commands.  Include the command name to get more info about it.')
    .setDefaultPermission(true)

export async function execute(interaction: CommandInteraction) {
    interaction.deferReply();
    //const commands = await interaction.client.application.commands.fetch();
    const commands = await interaction.guild.commands.fetch();
    const embed: MessageEmbed = new MessageEmbed({
        description: `${userMention(interaction.user.id)} Here is a list of my commands!`
    });
    for (const c of commands) {
        embed.fields.push({
            name: c[1].name,
            value: `Description: ${c[1].description}`,
            inline: true
        })
    }
    await interaction.user.send({ embeds: [embed] })
    await interaction.reply({content: `${userMention(interaction.user.id)} I sent my help command output to your inbox, click below to check!`, components: [await inboxLinkButton(interaction.user)]})
}

