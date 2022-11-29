import { Message, EmbedBuilder } from "discord.js";
import { leaderboard, logger, mongoClient } from "../arbi";
import { IBlessings } from "../general/IBlessing";
import { IBuffDebuff } from "../general/IBuffDebuff";
import { connectToCollection, fuzzySearch, getInput, getLeaderboard, ICommandInfo, IGuide } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'bless',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        try {
            const collection = await connectToCollection('blessings', mongoClient);
            const blessings = await collection.find<IBlessings>({}).toArray();
            
            //const searchArray = message.content.split(' ');
            //searchArray.shift();
            const searchText = input;
            const embed: EmbedBuilder = new EmbedBuilder();
            const found: IBuffDebuff[] = fuzzySearch(blessings,searchText,['tag']);
            if(found.length > 0){
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