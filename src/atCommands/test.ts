import { bold, userMention } from "@discordjs/builders";
import { Message } from "discord.js";
import { leaderboard } from "../arbi";
import { connectToCollection, connectToDB, fuzzySearch, getInput, ICommandInfo, IGuide } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'test',
    execute: async (message: Message): Promise<boolean> => {
        console.log(leaderboard);
        return true;
    }
}
export default commandFile;