import { bold, userMention } from "@discordjs/builders";
import { Message, MessageEmbed } from "discord.js";
import { IShardData, msToTime } from "../general/IShardData";
import { clipText, connectToCollection, connectToDB, fuzzySearch, getInput, getTop, ICommandInfo, IGuide } from "../general/util";
import { topText } from '../arbi'

const commandFile: ICommandInfo = {
  name: 'top',
  execute: async (message: Message): Promise<boolean> => {
    try {
      if (!topText) {
        message.reply(
          {
            allowedMentions: {
              repliedUser: false
            },
            content: `This info is not gathered yet, try again in a few minutes.`

          }
        )
        return true;
      }
      //orderBySumValue:{$add: ["$Value1", "$Value2"]}}}
      /*
      let top100: IShardData[] = await collection.find<IShardData>({}, {
          projection: {
              "shards.ancient.pulled": 1, "shards.void.pulled": 1, "shards.sacred.pulled": 1, orderBySumValue: { $add: ["$shards.ancient.pulled", "$shards.void.pulled", "$shards.sacred.pulled"] }
          }, sort: { orderBySumValue: -1 }, limit: 5
      }).toArray()*/

      const embed: MessageEmbed = new MessageEmbed(
        {
          description: clipText(`Top 25 summon users (based on shards "pulled"):\n${topText}`)
        }
      )
      await message.reply(
        {
          allowedMentions: {
            repliedUser: false
          },
          embeds: [embed]
        }
      )
      return true;
    }
    catch (err) {
      console.log(err);
      const errEmbed: MessageEmbed = new MessageEmbed({
        description: `There was an error with the command, it is logged and we will look into it!`
      })
      message.reply(
        {
          allowedMentions: {
            repliedUser: false
          }
        }
      )
    }
  }
}


export default commandFile;