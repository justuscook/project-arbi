import { bold, userMention } from "@discordjs/builders";
import axios from "axios";
import { Message, MessageEmbed } from "discord.js";
import { connectToCollection, connectToDB, fuzzySearch, getInput, ICommandInfo, IGuide } from "../general/util";
import { JSDOM } from 'jsdom';
import { logger } from "../arbi";

const commandFile: ICommandInfo = {
    name: 'support',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        try {
            const embed: MessageEmbed = new MessageEmbed({
                color: 'GOLD',
                description: `If you need help with ${message.client.application.name} or just want to chat [join our support server](https://discord.gg/c5cz9P784j)`
            })
            await message.reply({
                allowedMentions: {
                    repliedUser: false
                }, embeds: [embed]
            });
            return true;
        }
        catch (err) {
            console.log(err)
            logger.error(err)
            return false;
        }
    }
}
export default commandFile;
