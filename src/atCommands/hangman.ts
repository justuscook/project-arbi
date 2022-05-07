import { bold, userMention } from "@discordjs/builders";
import { Message, MessageEmbed } from "discord.js";
import { IShardData, msToTime } from "../general/IShardData";
import { clipText, connectToCollection, connectToDB, fuzzySearch, getInput, getTop, ICommandInfo, IGuide } from "../general/util";
import { topText } from '../arbi'

const commandFile: ICommandInfo = {
  name: 'hangman',
  execute: async (message: Message, input?: string): Promise<boolean> => {
    try {
      return true
    }
    catch (error) {
      return false
    }
  }
}


export default commandFile;