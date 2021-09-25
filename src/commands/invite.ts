import { SlashCommandBuilder } from '@discordjs/builders';
import exp from 'constants';
import discord, { MessageEmbed } from 'discord.js';
import { EmbedColor } from '../general/util'
const embed: MessageEmbed = new MessageEmbed({
    type: 'rich',
    color: EmbedColor.YELLOW,
    description: 'You don\'t have Arbi on your other servers yet?\nWhat are you waiting for [click here NOW](https://discordapp.com/oauth2/authorize?client_id=563434743824252928&scope=bot&permissions=392256)'
})

export const data: SlashCommandBuilder = new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Invite Arbi to help you lookup Raid:SL character info and much more!');
export async function execute(interaction)  {
        return interaction.reply({embeds: [embed]});
    }




    
