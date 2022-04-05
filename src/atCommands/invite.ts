import { bold, userMention } from "@discordjs/builders";
import { Message, MessageEmbed } from "discord.js";
import { leaderboard, logger } from "../arbi";
import { connectToCollection, connectToDB, fuzzySearch, getInput, getLeaderboard, ICommandInfo, IGuide } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'invite',
    execute: async (message: Message): Promise<boolean> => {
        try {
            const embed: MessageEmbed = new MessageEmbed({
                color: 'GOLD',
                description: `You don\'t have ${message.client.application.name} on your other servers yet?\nWhat are you waiting for [click here NOW](https://discord.com/api/oauth2/authorize?client_id=888450658397741057&permissions=534723946560&scope=applications.commands%20bot)`
            })
            await message.reply({
                allowedMentions: {
                    repliedUser: false
                }, embeds: [embed]
            });
            return true;
        }
        catch (err) {
            logger.error(err)
            return false;
        }
    }
}
export default commandFile;