import { bold, userMention } from "@discordjs/builders";
import { Message } from "discord.js";
import { connectToCollection, connectToDB, fuzzySearch, getInput, ICommandInfo, IGuide } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'test',
    execute: async (message: Message): Promise<boolean> => {
        
        return true;
    }
}
export default commandFile;