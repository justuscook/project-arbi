import { bold, userMention } from "@discordjs/builders";
import { Message } from "discord.js";
import { connectToCollection, connectToDB, fuzzySearch, getInput, ICommandInfo, IGuide } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'delete',
    execute: async (message: Message): Promise<boolean> => {
        const search = getInput(message.content);
        const mongoClient = await connectToDB();
        const collection = await connectToCollection('guides', mongoClient);
        const deletedGuide = await collection.findOneAndDelete({ title: search });
        await mongoClient.close();
        if (deletedGuide.value) {
            message.reply(`${userMention(message.author.id)} the guide ${bold(search)} was successfully deleted!`)
        }
        else {
            message.reply(`${userMention(message.author.id)} the guide ${bold(search)} was not found!`)
        }
        return true;
    }
}
export default commandFile;