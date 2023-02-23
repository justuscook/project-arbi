import axios from "axios";
import { Message, EmbedBuilder } from "discord.js";
import { connectToCollection, fuzzySearch, getInput, ICommandInfo, IGuide } from "../general/util";
import { JSDOM } from 'jsdom';

const commandFile: ICommandInfo = {
    name: 'server',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        await message.reply({
            content: 'https://raid-support.plarium.com/hc/en-us/articles/360017265739--Server-status',
            allowedMentions: {
                repliedUser: false
            }
        });
        return true;
    },
    restricted: false
}
export default commandFile;
