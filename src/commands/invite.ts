import { SlashCommandBuilder } from '@discordjs/builders';
import exp from 'constants';
import discord, { CommandInteraction, MessageEmbed } from 'discord.js';


export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('invite')
    .setDefaultPermission(true)
    .setDescription('Invite Arbi to help you lookup Raid:SL character info and much more!');
export async function execute(interaction: CommandInteraction) {
    await interaction.deferReply()
    const embed: MessageEmbed = new MessageEmbed({
        color: 'GOLD',
        description: 'You don\'t have Arbi on your other servers yet?\nWhat are you waiting for [click here NOW](https://discord.com/api/oauth2/authorize?client_id=888450658397741057&permissions=534723946560&scope=applications.commands%20bot)'
    })
    await interaction.followUp({ embeds: [embed] });
}

export const registerforTesting = false;




