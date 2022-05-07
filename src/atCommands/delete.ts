import { bold, userMention } from "@discordjs/builders";
import { Message, ReplyMessageOptions } from "discord.js";
import { connectToCollection, connectToDB, fuzzySearch, getInput, ICommandInfo, IGuide } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'delete',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        const search = getInput(message.content);
        const mongoClient = await connectToDB();
        const collection = await connectToCollection('guides', mongoClient);
        const deletedGuide = await collection.findOneAndDelete({ title: search });
        await mongoClient.close();
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