import { bold, Message, userMention } from "discord.js";
import { mongoClient } from "../arbi";
import { connectToCollection, getInput, ICommandInfo } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'delete',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        const search = getInput(message.content);
        
        const collection = await connectToCollection('guides', mongoClient);
        const deletedGuide = await collection.findOneAndDelete({ title: search });
        
        if (deletedGuide.value) {
            message.reply({
                allowedMentions: {
                    repliedUser: false
                },
                content: `${userMention(message.author.id)} the guide ${bold(search)} was successfully deleted!`
            })
        }
        else {
            message.reply({
                allowedMentions: {
                    repliedUser: false
                },
                content: `${userMention(message.author.id)} the guide ${bold(search)} was not found!`
            })
        }
        return true;
    },
    restricted: true
}
export default commandFile;