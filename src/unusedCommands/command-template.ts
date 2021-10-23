import { SlashCommandBuilder } from '@discordjs/builders';
import { time } from 'console';
import exp from 'constants';
import discord, { ApplicationCommandPermissionData, ButtonInteraction, CommandInteraction, Interaction, MessageActionRow, MessageButton, MessageComponent, MessageComponentCollectorOptions, MessageComponentInteraction, MessageEmbed, MessageSelectMenu, MessageSelectMenuOptions } from 'discord.js';

export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('name')
    .addStringOption(option => option.setName('champion_name').setDescription('Enter a champions name').setRequired(true))
    .setDescription('Search for guidesby champion or dungeon name.')
    .setDefaultPermission(false)

export async function execute(interaction: CommandInteraction) {
    interaction.deferReply();
    
}

export const permissions: ApplicationCommandPermissionData[] = [
    {
        id: '227837830704005140',
        type: 'USER',
        permission: true
    },
    {
        id: '269643701888745474',
        type: 'USER',
        permission: true
    },
    {
        id: '205448080797990912',
        type: 'USER',
        permission: true
    }
]