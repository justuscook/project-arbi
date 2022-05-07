import { bold, userMention } from "@discordjs/builders";
import { Message, MessageEmbed } from "discord.js";
import { leaderboard, logger } from "../arbi";
import { IBuffDebuff } from "../general/IBuffDebuff";
import { connectToCollection, connectToDB, fuzzySearch, getInput, getLeaderboard, ICommandInfo, IGuide } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'debuff',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        try {
            const mongoClient = await connectToDB();
            const collection = await connectToCollection('buffs_debuffs', mongoClient);
            const buffs = await collection.find<IBuffDebuff>({}).toArray();
            await mongoClient.close()
            //const searchArray = message.content.split(' ');
            //searchArray.shift();
            const searchText = input;
            const embed: MessageEmbed = new MessageEmbed();
            const found: IBuffDebuff[] = fuzzySearch(buffs,searchText,['name']);
            if(found.length > 0){
                embed.setDescription(found[0].desc)
                embed.setImage(found[0].image)
                embed.setTitle(found[0].name);
            }
            else {
                embed.setDescription(`I didn't find any results for ${searchText}, please try your search again.`)
            }
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