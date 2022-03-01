import { bold, userMention } from "@discordjs/builders";
import { Message, MessageEmbed } from "discord.js";
import { client, leaderboard } from "../arbi";
import { connectToCollection, connectToDB, fuzzySearch, getInput, ICommandInfo, IGuide } from "../general/util";
import fs from 'fs';

const commandFile: ICommandInfo = {
    name: 'help',
    execute: async (message: Message): Promise<boolean> => {
        try {
            if (message.mentions.has(client.user.id)) {
                if (message.content.split(' ')[1] !== 'help') {
                    return;
                }
                console.log(message.content)
                const commands = await client.application.commands.fetch();
                const embed: MessageEmbed = new MessageEmbed({
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
                for (const c of commands) {
                    embed.fields.push({
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
        }
        catch {
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