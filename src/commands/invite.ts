import discord, { CommandInteraction, EmbedBuilder, SlashCommandBuilder, Colors, ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../arbi';
import { ServerSettings } from '../general/util';

export const registerforTesting = false;
export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Invite Arbie to help you lookup Raid:SL character info and much more!');
export async function execute(interaction: ChatInputCommandInteraction, serverSettings?: ServerSettings) : Promise<boolean>{
    await interaction.deferReply();
    try {
        const embed: EmbedBuilder = new EmbedBuilder({
            color: Colors.Gold,
            description: `You don\'t have ${interaction.client.application.name} on your other servers yet?\nWhat are you waiting for [click here NOW](https://discord.com/api/oauth2/authorize?client_id=888450658397741057&permissions=534723946560&scope=applications.commands%20bot)`
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


export const usage = `/invite`;



