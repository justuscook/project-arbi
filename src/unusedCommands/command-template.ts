import { time } from 'console';
import exp from 'constants';
import discord, { ButtonInteraction, CommandInteraction, Interaction, ActionRowBuilder, ButtonBuilder, MessageComponent, MessageComponentCollectorOptions, MessageComponentInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('name')
    .addStringOption(option => option.setName('champion_name').setDescription('Enter a champions name').setRequired(true))
    .setDescription('Search for guidesby champion or dungeon name.')
    .setDefaultPermission(false)

export async function execute(interaction: CommandInteraction) {
    await interaction.deferReply();
    
}
/*
export const permissions: PermissionFlags[] = [
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
*/

export const registerforTesting = false;