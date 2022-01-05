import { SlashCommandBuilder } from '@discordjs/builders';
import exp from 'constants';
import discord, { CommandInteraction, MessageEmbed } from 'discord.js';
import { logger } from '../arbi';


export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('support')
    .setDefaultPermission(true)
    .setDescription('Join the support server to get help or just chat with us');
export async function execute(interaction: CommandInteraction) : Promise<boolean>{
    await interaction.deferReply();
    try {
        const embed: MessageEmbed = new MessageEmbed({
            color: 'GOLD',
            description: `If you need help with ${interaction.client.application.name} or just want to chat [join our support server](https://discord.gg/c5cz9P784j)`
        })
        await interaction.followUp({ embeds: [embed] });
        return true;
    }
    catch(err){
        logger.error(err)
        return false;
    }
}

export const registerforTesting = false;




