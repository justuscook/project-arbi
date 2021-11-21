import { bold, Embed, SlashCommandBuilder, userMention } from '@discordjs/builders';
import { ApplicationCommandPermissionData, ButtonInteraction, CommandInteraction, Interaction, Message, MessageActionRow, MessageButton, MessageComponent, MessageComponentCollectorOptions, MessageComponentInteraction, MessageEmbed, MessageSelectMenu, MessageSelectMenuOptions } from 'discord.js';
import { stringify } from 'querystring';
import { inboxLinkButton } from '../general/util'
import fs from 'fs';
import * as util from '../general/util'
import { logger } from '../arbi';

export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('help')
    .addStringOption(option => option.setName('command_name').setDescription('Command to get more info on.').setRequired(false))
    .setDescription('Look up available commands.  Include the command name to get more info about it.')
    .setDefaultPermission(true)


export async function execute(interaction: CommandInteraction): Promise<boolean> {
    await interaction.deferReply();
    try {
        let commandName = interaction.options.getString('command_name')
        let canShow = await util.canShow(interaction);
        let showInServer = false;
        if (commandName !== null) {
            if (commandName.toLowerCase().includes('show')) {
                showInServer = true;
                commandName = util.removeShow(commandName).trimEnd().trimStart();
                commandName = commandName;
            }
        }
        console.log(commandName)
        //const commands = await interaction.client.application.commands.fetch();
        const commands = await interaction.client.application.commands.fetch();
        const embed: MessageEmbed = new MessageEmbed({
            description: `${userMention((await interaction.user.fetch()).id)} Here is a list of my commands!`
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
        if (canShow && showInServer) {
            //await interaction.followUp({ content: `${userMention(interaction.user.id)} I sent my help command output to your inbox, click below to check!`, components: [await inboxLinkButton(interaction.user)] })
            await interaction.followUp({ embeds: [embed] })
        }
        else {
            console.log('test')
            if ( interaction.channel !== null) {
                const help = await interaction.followUp({ content: `${userMention((await interaction.user.fetch()).id)}${(showInServer) ? 'You can\'t show commands in this server.' : ''} I sent my help command output to your inbox, click below to check!`, components: [await inboxLinkButton(interaction.user)] })
                await util.delayDeleteMessages([help as Message])
            }
            await interaction.user.send({ embeds: [embed] })
        }

        return true;
    }
    catch (err) {
        logger.error(err)
        return false;
    }
}

export const usage = `/help - for basic help\n/help ${bold('tab')} command_name - for info about a command`;

export const registerforTesting = false;

