import { bold, Embed, SlashCommandBuilder, userMention } from '@discordjs/builders';
import { ApplicationCommandPermissionData, ButtonInteraction, CommandInteraction, Interaction, MessageActionRow, MessageButton, MessageComponent, MessageComponentCollectorOptions, MessageComponentInteraction, MessageEmbed, MessageSelectMenu, MessageSelectMenuOptions } from 'discord.js';
import { stringify } from 'querystring';
import { EmbedColor, inboxLinkButton } from '../general/util'
import fs from 'fs';

export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('help')
    .addStringOption(option => option.setName('command_name').setDescription('Command to get more info on.').setRequired(false))
    .setDescription('Look up available commands.  Include the command name to get more info about it.')
    .setDefaultPermission(true)


export async function execute(interaction: CommandInteraction) {
    await interaction.deferReply();
    const commandName = interaction.options.getString('command_name')
    //const commands = await interaction.client.application.commands.fetch();
    const commands = await interaction.guild.commands.fetch();
    const embed: MessageEmbed = new MessageEmbed({
        description: `${userMention(interaction.user.id)} Here is a list of my commands!`
    });
    const commandFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.js'));
    interface commandUsage {
        usage: string,
        name: string
    }
    const commandUsage: commandUsage[] = [];

    for (const file of commandFiles) {
        const command = require(__dirname + `\\${file}`);
        commandUsage.push({
            name:file,
            usage: command.usage})
    }
console.log(commandUsage)
    for (const c of commands) {
        if(commandName !== null && commandName !== c[1].name)
        {
            continue;
        }
        embed.fields.push({
            name: c[1].name,
            value: `Description: ${c[1].description}`,
            inline: false
        });
        if (c[1].name === commandName) {
            embed.fields.push({
                name: 'How to use:',
                value: (commandUsage.filter(x => x.name === commandName).length > 0) ? commandUsage.find(x => x.name === commandName).usage : 'Coming soon!',
                inline: false
            })
            console.log(commandUsage.find(x => x.name === commandName) )
            embed.description = `Here is more help with ${c[1].name!}`;
            break;
        }
    }
    
    await interaction.followUp({ content: `${userMention(interaction.user.id)} I sent my help command output to your inbox, click below to check!`, components: [await inboxLinkButton(interaction.user)] })
    await interaction.user.send({ embeds: [embed] })
}

export const usage = `/help for basic help\n/help ${bold('tab')} command_name for more help on a command`
