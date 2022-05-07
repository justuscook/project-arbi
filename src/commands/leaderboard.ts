import { SlashCommandBuilder } from '@discordjs/builders';
import { time } from 'console';
import exp from 'constants';
import discord, { ApplicationCommandPermissionData, ButtonInteraction, CommandInteraction, Interaction, MessageActionRow, MessageButton, MessageComponent, MessageComponentCollectorOptions, MessageComponentInteraction, MessageEmbed, MessageSelectMenu, MessageSelectMenuOptions } from 'discord.js';
import { leaderboard } from '../arbi';
import { connectToCollection, connectToDB, IGuide } from '../general/util';

export const registerforTesting = false;
export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Gets the lastest leaderboard for guide submissions!')
    .setDefaultPermission(true)

export async function execute(interaction: CommandInteraction) {
    await interaction.deferReply();
    const mongoClient = await connectToDB();
    const collection = await connectToCollection('guides', mongoClient);
    const guides = await collection.find<IGuide>({}).toArray();
    await mongoClient.close()
    let numGuides = 0;
    let numPages = 0;
    let rank = 1;
    let leaderboardtext = '';
    let leaderboardtext2 = '';
    let leaderboardtext3 = '';
    for (const g of guides) {
        numGuides++;
        numPages += g.data.length;
    }
    //const leaderboardInfo = await getLeaderboard();
    leaderboard.forEach((v, k) => {
        switch (rank) {
            case 1: {
                leaderboardtext += `🥇 ⚔ #1: ${k}: ${v}\n`;
                break;
            }
            case 2: {
                leaderboardtext += `🥈 ⚔ #2: ${k}: ${v}\n`;
                break;
            }
            case 3: {
                leaderboardtext += `🥉 ⚔ #3: ${k}: ${v}\n`;
                break;
            }
            default: {
                if (v > 5) {
                    leaderboardtext += `${(v > 5) ? '⚔' : ''} ${rank}: ${k}: ${v}\n`;
                }
                else if (v > 1) {
                    leaderboardtext2 += `${rank}: ${k}: ${v}\n`;
                }
                else {
                    leaderboardtext3 += `${rank}: ${k}: ${v}\n`;
                }
                break;
            }
        }
        rank++;
    })
    const embed = new MessageEmbed({
        author: { name: `${numGuides} total pages with ${numPages} slides!` },
        fields: [{ name: `Elite Guide submitters leaderboard:`, value: `\`\`\`${leaderboardtext}\`\`\`` }]//{name: `Other guide submitters`,value:`\`\`\`${leaderboardtext2}\`\`\``}
    });
    const embed2 = new MessageEmbed({

        fields: [{ name: `Other guide submitters`, value: `\`\`\`${leaderboardtext2}\`\`\`` }]
    });
    const embed3 = new MessageEmbed({

        fields: [{ name: `Other guide submitters`, value: `\`\`\`${leaderboardtext3}\`\`\`` }]
    });
    console.log(leaderboardtext);
    console.log(leaderboardtext2);

    await interaction.followUp({ embeds: [embed, embed2, embed3] })
    return true;
}


export const usage = `/leaderboard`;