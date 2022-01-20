import { bold, userMention } from "@discordjs/builders";
import { Message } from "discord.js";
import { connectToCollection, connectToDB, fuzzySearch, getInput, ICommandInfo, IGuide } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'reboot',
    execute: async (message: Message): Promise<boolean> => {
        await message.reply('Rebooting, this shouldn\'t take long 😴...🌄');
        process.exit();        
    }
}
export default commandFile;