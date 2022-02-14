import { bold, userMention } from "@discordjs/builders";
import { Message } from "discord.js";
import { leaderboard } from "../arbi";
import { connectToCollection, connectToDB, fuzzySearch, getInput, getLeaderboard, ICommandInfo, IGuide } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'test',
    execute: async (message: Message): Promise<boolean> => {
        const test = await getLeaderboard();
        console.log(test);
        message.reply('Test command complete!')
        return true;
    }
}
export default commandFile;