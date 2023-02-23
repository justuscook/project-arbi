import axios from 'axios';
import discord, { ChatInputCommandInteraction, CommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { JSDOM } from 'jsdom';
import { logger } from '../arbi';
import { ServerSettings } from '../general/util';

export const registerforTesting = false;
export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('server')
    .setDescription('Check the status of the R:SL servers!');
export async function execute(interaction: ChatInputCommandInteraction, serverSettings?: ServerSettings): Promise<boolean> {
    await interaction.deferReply();
    await interaction.followUp('https://raid-support.plarium.com/hc/en-us/articles/360017265739--Server-status')
    return true;
}

export const usage = `/server`;




