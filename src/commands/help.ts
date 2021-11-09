import { bold, Embed, SlashCommandBuilder, userMention } from '@discordjs/builders';
import { ApplicationCommandPermissionData, ButtonInteraction, CommandInteraction, Interaction, MessageActionRow, MessageButton, MessageComponent, MessageComponentCollectorOptions, MessageComponentInteraction, MessageEmbed, MessageSelectMenu, MessageSelectMenuOptions } from 'discord.js';
import { stringify } from 'querystring';
import { inboxLinkButton } from '../general/util'
import fs from 'fs';
import * as util from '../general/util'

export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('help')
    .addStringOption(option => option.setName('command_name').setDescription('Command to get more info on.').setRequired(false))
    .setDescription('Look up available commands.  Include the command name to get more info about it.')
    .setDefaultPermission(true)


export async function execute(interaction: CommandInteraction) {
    await interaction.deferReply();
    let commandName = interaction.options.getString('command_name')
    if (commandName.toLowerCase().includes('show')) {
        commandName = util.removeShow(commandName).trimEnd().trimStart();
        commandName = commandName;
        //const commands = await interaction.client.application.commands.fetch();
        const commands = await interaction.client.application.commands.fetch();
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
            const command = require(__dirname + `//${file}`);
            commandUsage.push({
                name: file.replace('.js', '').toLowerCase(),
                usage: command.usage
            })
            //console.lo
        }
        const command = commands.find(x => x.name.toLowerCase() === commandName)
        if (command === undefined) {
            for (const c of commands) {
                embed.fields.push({
                    name: c[1].name,
                    value: `Description: ${c[1].description}`,
                    inline: false
                });
            }
        } else {
            embed.fields.push({
                name: 'How to use:',
                value: (commandUsage.find(x => x.name.toLowerCase() === commandName.toLowerCase()).usage !== undefined) ? commandUsage.find(x => x.name.toLowerCase() === commandName.toLowerCase()).usage : command.description,
                inline: false
            })
            embed.description = `Here is more info about ${command.name!}`;
        }
        await interaction.followUp({ content: `${userMention(interaction.user.id)} I sent my help command output to your inbox, click below to check!`, components: [await inboxLinkButton(interaction.user)] })
        await interaction.user.send({ embeds: [embed] })
    }
}

export const usage = `/help - for basic help\n/help ${bold('tab')} command_name - for info about a command`;

export const registerforTesting = false;

