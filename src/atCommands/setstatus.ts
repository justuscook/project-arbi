import { bold, userMention } from "@discordjs/builders";
import { Message, MessageEmbed } from "discord.js";
import { client, leaderboard, logger } from "../arbi";
import { connectToCollection, fuzzySearch, getInput, getLeaderboard, ICommandInfo, IGuide } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'setstatus',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        await client.user.setActivity(input, {type: 'WATCHING'});
        return true;
    },
    restricted: true
}
export default commandFile;