import discord, { ChatInputCommandInteraction, Colors, CommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { logger } from '../arbi';
import { ServerSettings } from '../general/util';

export const registerforTesting = false;
export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('support')    
    .setDescription('Join the support server to get help or just chat with us');
export async function execute(interaction: ChatInputCommandInteraction, serverSettings?: ServerSettings) : Promise<boolean>{
    await interaction.deferReply();
    try {
        const embed: EmbedBuilder = new EmbedBuilder({
            color: Colors.Gold,
            description: `If you need help with ${interaction.client.application.name} or just want to chat [join our support server](https://discord.gg/c5cz9P784j)`
        })
        await interaction.followUp({ embeds: [embed] });
        return true;
    }
    catch(err){
        console.log(err)
        logger.error(err)
        return false;
    }
}

export const usage = `/support`;




