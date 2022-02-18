import { bold, userMention } from "@discordjs/builders";
import { Message } from "discord.js";
import { IShardData } from "../general/IShardData";
import { connectToCollection, connectToDB, fuzzySearch, getInput, ICommandInfo, IGuide } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'claim',
    execute: async (message: Message): Promise<boolean> => {
        const search = getInput(message.content);
        const mongoClient = await connectToDB();
        const collection = await connectToCollection('user_shard_data', mongoClient);
        const userDate = await collection.findOne<IShardData>({userID: message.author.id})
        await mongoClient.close();
        return true;
    }    
}
export default commandFile;