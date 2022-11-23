import { ButtonInteraction, CommandInteraction, Interaction, Message, ActionRowBuilder, ButtonBuilder, MessageComponent, MessageComponentCollectorOptions, MessageComponentInteraction, EmbedBuilder, bold, SlashCommandBuilder, userMention, ChatInputCommandInteraction } from 'discord.js';
import { stringify } from 'querystring';
import { inboxLinkButton } from '../general/util'
import fs from 'fs';
import * as util from '../general/util'
import { client, logger } from '../arbi';

export const registerforTesting = false;
export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('help')
    .addStringOption(option => option.setName('command_name').setDescription('Command to get more info on.').setRequired(false))
    .setDescription('Look up available commands.  Include the command name to get more info about it.')
    .setDefaultPermission(true)


export async function execute(interaction: ChatInputCommandInteraction): Promise<boolean> {
    const input = interaction.options.getString('command_name');
    await interaction.deferReply();
    try {
        if (!input) {
            const commands = await client.application.commands.fetch();
            const embed: EmbedBuilder = new EmbedBuilder({
                description: `${userMention((await interaction.user.fetch()).id)} Here is a list of my commands!`,
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
            embed.addFields(
                {
                    inline: false,
                    name: 'Command versions',
                    value: `Each command has a @ (Arbie mention - @Arbie) and a slash version (/command).  Each version takes the same input, but you supply it a different way.  The @ commands are the old way commands worked, all info is typed out at once like "@Arbie summon sacred 10".  For slash commands, once you choose a command that needs input, you will see a input variable with a name appear.  Then you will type what you normaly type after the command. For example "/summon input: sacred 10".  Other than that the command should be have in the same way!  As always you can use /support or @Arbie support to join the support server and ask for more help!`
                }
            )
            for (const c of commands) {
                embed.addFields({
                    name: c[1].name,
                    value: `Description: ${c[1].description}`,
                    inline: false
                });
            }
            await interaction.followUp({
                allowedMentions: {
                    repliedUser: false
                }, embeds: [embed]
            });
        }
        else {
            const commands = await client.application.commands.fetch();
            const embed: EmbedBuilder = new EmbedBuilder({
                description: `${userMention((await interaction.user.fetch()).id)} Here is help for ${input}!`,
            });
            const commandFiles = fs.readdirSync(__dirname).filter(file => file.endsWith(`${input}.js`));
            const command = require(__dirname + `//${commandFiles[0]}`);
            embed.addFields(
                {
                    inline: false,
                    name: 'Command versions',
                    value: `Each command has a @ (Arbie mention - @Arbie) and a slash version (/command).  Each version takes the same input, but you supply it a different way.  The @ commands are the old way commands worked, all info is typed out at once like "@Arbie summon sacred 10".  For slash commands, once you choose a command that needs input, you will see a input variable with a name appear.  Then you will type what you normaly type after the command. For example "/summon input: sacred 10".  Other than that the command should be have in the same way!  As always you can use /support or @Arbie support to join the support server and ask for more help!`
                },
                {
                    inline: false,
                    name: command.data.name,
                    value: `Description: ${command.data.description}\nUsage: ${command.usage}`
                }
            )
            await interaction.followUp({
                allowedMentions: {
                    repliedUser: false
                }, embeds: [embed]
            });
        }
    }

    catch (error) {
        console.log(`Error in help:\n${error}`)
        await interaction.followUp({
            allowedMentions: {
                repliedUser: false
            }, content: `Sorry there is no command called ${bold(input)}, try your search again.`
        });
        return false;
    }

}

export const usage = `/help - for basic help\n/help ${bold('tab')} command_name - for info about a command`;



