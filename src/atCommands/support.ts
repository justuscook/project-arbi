import { Message, EmbedBuilder, Colors } from "discord.js";
import { ICommandInfo } from "../general/util";
import { logger } from "../arbi";

const commandFile: ICommandInfo = {
    name: 'support',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        try {
            const embed: EmbedBuilder = new EmbedBuilder({
                color: Colors.Gold,
                description: `If you need help with ${message.client.application.name} or just want to chat [join our support server](https://discord.gg/c5cz9P784j)`
            })
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
