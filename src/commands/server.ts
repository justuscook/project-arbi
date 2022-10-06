import axios from 'axios';
import discord, { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { JSDOM } from 'jsdom';
import { logger } from '../arbi';

export const registerforTesting = false;
export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('server')
    .setDefaultPermission(true)
    .setDescription('Join the support server to get help or just chat with us');
export async function execute(interaction: CommandInteraction): Promise<boolean> {
    await interaction.deferReply();
    let embed: EmbedBuilder;
    let statusText: string;
    try {
        const response = await axios({
            url: "https://raid-support.zendesk.com/api/v2/help_center/en-us/articles/360017253919.json",
            responseType: 'json'
        })
        const dom = new JSDOM(response.data.article.body)
        statusText = dom.window.document.querySelector('span').textContent;
        const title = response.data.article.title;
        embed = new EmbedBuilder(
            {
                description: statusText,
                author: {
                    name: title,
                    iconURL: 'https://play-lh.googleusercontent.com/xJWR1EUl16rvKtmZRvF9p1AHEp8lIZfuRIRLLgNG69v3Gy8dU92sVHq_braXuz0vQAo=s180-rw'
                },
                footer: {
                    text: 'Currently this is only for US region.'
                }
            }
        )
        await interaction.followUp({
            allowedMentions: {
                repliedUser: false
            }, embeds: [embed]
        })
        return true;
    }
    catch (err) {
        embed = new EmbedBuilder(
            {
                description: "The server is not responding, its probably down for maintenance.",
                author: {
                    name: "Server Down",
                    iconURL: 'https://play-lh.googleusercontent.com/xJWR1EUl16rvKtmZRvF9p1AHEp8lIZfuRIRLLgNG69v3Gy8dU92sVHq_braXuz0vQAo=s180-rw'
                },
                footer: {
                    text: 'Currently this is only for US region.'
                }
            }
        )
        embed.setDescription('.');
        await interaction.followUp({
            allowedMentions: {
                repliedUser: false
            }, embeds: [embed]
        })
        return true;
    }
}

export const usage = `/server`;




