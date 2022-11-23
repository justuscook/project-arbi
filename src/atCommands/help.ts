import { Message, EmbedBuilder, userMention } from "discord.js";
import { client, leaderboard } from "../arbi";
import { connectToCollection, fuzzySearch, getInput, ICommandInfo, IGuide } from "../general/util";
import fs from 'fs';

const commandFile: ICommandInfo = {
    name: 'help',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        try {
            //if (message.mentions.has(client.user.id)) {
            /*
            if (message.content.split(' ')[1] !== 'help') {
                return;
            }*/
            if (input === '') {
                const commands = await client.application.commands.fetch();
                const embed: EmbedBuilder = new EmbedBuilder({
                    description: `${userMention((await message.author.fetch()).id)} Here is a list of my commands!`,
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
                await message.reply({
                    allowedMentions: {
                        repliedUser: false
                    }, embeds: [embed]
                });
            }
            else {
                const commands = await client.application.commands.fetch();
                const embed: EmbedBuilder = new EmbedBuilder({
                    description: `${userMention((await message.author.fetch()).id)} Here is help for ${input}!`,
                });
                const commandFiles = fs.readdirSync(__dirname + '//..//commands').filter(file => file.endsWith(`${input}.js`));
                const command = require(__dirname + `//..//commands//${commandFiles[0]}`);
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
                await message.reply({
                    allowedMentions: {
                        repliedUser: false
                    }, embeds: [embed]
                });
            }
            //}
        }
        catch (error) {
            console.log(`Error in help:\n${error}`)
            await message.reply({
                allowedMentions: {
                    repliedUser: false
                }, content: `There was an issue with your help command, it has been logged.  Please join the support server with /support if it continues to happen.`
            });
            return false;
        }

    },
}
export default commandFile;