import { Message, EmbedBuilder } from "discord.js";
import { leaderboard, logger, mongoClient } from "../arbi";
import { IBuffDebuff } from "../general/IBuffDebuff";
import { connectToCollection, fuzzySearch, getInput, getLeaderboard, ICommandInfo, IGuide, ServerSettings } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'debuff',
    execute: async (message: Message, input?: string, serverSettings?: ServerSettings): Promise<boolean> => {
        try {
            
            const collection = await connectToCollection('buffs_debuffs', mongoClient);
            const buffs = await collection.find<IBuffDebuff>({}).toArray();
            
            //const searchArray = message.content.split(' ');
            //searchArray.shift();
            const searchText = input;
            const embed: EmbedBuilder = new EmbedBuilder();
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