import { Message } from "discord.js";
import { connectToCollection, fuzzySearch, getInput, ICommandInfo, IGuide } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'reboot',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        await message.reply('Rebooting, this shouldn\'t take long 😴...🌄');
        process.exit();        
    },
    restricted: true
    
}
export default commandFile;