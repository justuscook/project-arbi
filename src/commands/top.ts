import discord, { ChatInputCommandInteraction, CommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { logger } from '../arbi';
import { IShardData, Mercy, msToTime } from '../general/IShardData';
import { clipText, connectToCollection, ServerSettings } from '../general/util';
import { topText } from '../arbi'

export const registerforTesting = false;
export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('top')    
    .setDescription('Get the top 25 summoners leaderboard!');
export async function execute(interaction: ChatInputCommandInteraction, serverSettings?: ServerSettings): Promise<boolean> {
    await interaction.deferReply();

    try {
        if (!topText) {
            interaction.followUp(
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

        const embed: EmbedBuilder = new EmbedBuilder(
            {
                description: clipText(`Top 25 summon users (based on shards "pulled"):\n${topText}`)
            }
        )
        await interaction.followUp(
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
        const errEmbed: EmbedBuilder = new EmbedBuilder({
            description: `There was an error with the command, it is logged and we will look into it!`
        })
        interaction.followUp(
            {
                allowedMentions: {
                    repliedUser: false
                }
            }
        )
    }
}

export const usage = `/top`;
