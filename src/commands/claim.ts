import { SlashCommandBuilder } from '@discordjs/builders';
import exp from 'constants';
import discord, { CommandInteraction, MessageEmbed } from 'discord.js';
import { logger } from '../arbi';
import { IShardData, Mercy, msToTime } from '../general/IShardData';
import { connectToCollection, connectToDB } from '../general/util';

export const registerforTesting = false;
export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('claim')
    .setDefaultPermission(true)
    .setDescription('Claim your daily tokens for summons!');
export async function execute(interaction: CommandInteraction): Promise<boolean> {
    await interaction.deferReply();
    const mongoClient = await connectToDB();
    const collection = await connectToCollection('user_shard_data', mongoClient);
    let userData: IShardData = await collection.findOne<IShardData>({ userID: interaction.user.id })

    let chest = '';
    let tokens = 0;
    let text = '';
    let color = 0;
    let image = '';
    const rand = Math.random();
    if (rand <= .91) {
        text = 'Your daily chest is a bronze.';
        chest = 'bronze';
        tokens = 25;
        color = 0xFF9D61;
        image = 'https://cdn.discordapp.com/attachments/897175894949523557/951140962715975690/bronze.png';
    } else if (rand <= .99) {
        text = 'Your daily chest is a **SILVER**, you get 2X tokens!';
        chest = 'silver';
        tokens = 50;
        color = 0xF3FFFF;
        image = 'https://cdn.discordapp.com/attachments/897175894949523557/951140962439147601/silver.png'
    } else {
        text = '**YOUR DAILY CHEST IS AN ULTRA RARE __GOLDEN__ CHEST**, YOU GET 4X TOKENS.';
        chest = 'gold';
        tokens = 100;
        color = 0xFFCF61;
        image = 'https://cdn.discordapp.com/attachments/897175894949523557/951140962145558528/gold.png'
    }
    const embed: MessageEmbed = new MessageEmbed(
        {
            color: color,
            description: text,
            image: {
                url: image
            }
        }
    )


    if (userData) {
        const now: Date = new Date(Date.now());
        const nowString = `${now.getUTCDate()}${now.getUTCMonth()}${now.getUTCFullYear()}`
        const lastClaimString = `${userData.lastClaim.getUTCDate()}${userData.lastClaim.getUTCMonth()}${userData.lastClaim.getUTCFullYear()}`
        if (lastClaimString !== nowString) {
            embed.addFields([
                {
                    name: 'Claimed tokens:',
                    value: tokens.toString()
                },
                {
                    name: 'Total tokens:',
                    value: (tokens + userData.tokens).toString()
                }
            ]);

            userData.tokens = tokens + userData.tokens;
            userData.lastClaim = new Date(Date.now()),
                userData.userID = interaction.user.id

        }
        else {

            const midnight = new Date;
            midnight.setUTCHours(24, 0, 0, 0);
            const waitTime = midnight.getTime() - now.getTime();
            const claimed = new MessageEmbed(
                {
                    description: `You have already claimed your daily chest today, try again in ${msToTime(waitTime)}.`,
                    footer: {
                        text: `Current tokens: ${userData.tokens}`
                    }
                }
            )
            await interaction.followUp({
                allowedMentions: {
                    repliedUser: false
                }, embeds: [claimed]
            });
            return true;
        }
    }
    else {
        const lastClaim = new Date(0);
        userData = {
            champions: {
                epic: [],
                legendary: [],
                rare: []
            },
            userID: interaction.user.id,
            lastClaim: lastClaim,
            mercy: {
                ancient: {
                    epic: 0,
                    legendary: 0
                },
                void: {
                    epic: 0,
                    legendary: 0
                },
                sacred: {
                    epic: 0,
                    legendary: 0
                },

            },
            tokens: 0,
            shards: {
                ancient: {
                    pulled: 0
                },
                void: {
                    pulled: 0
                },
                sacred: {
                    pulled: 0
                }
            }
        }
        embed.addFields([
            {
                name: 'Claimed tokens:',
                value: tokens.toString()
            },
            {
                name: 'Total tokens:',
                value: tokens.toString()
            }
        ]);
        userData.tokens = tokens;
        userData.lastClaim = new Date(Date.now())

    }
    await collection.updateOne(
        { userID: interaction.user.id },
        { $set: userData },
        { upsert: true },
        async (err: any, result: any) => {

            if (err) {
                await interaction.followUp(`╯︿╰ There seems to be an issue claiming your tokens, this is logged and we are looking into it.`)
                await mongoClient.close();
                return false;
            }
            else {
                await interaction.followUp({
                    allowedMentions: {
                        repliedUser: false
                    }, embeds: [embed],


                });
                await mongoClient.close();
            }
        });

    return true;
}
