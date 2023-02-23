import discord, {  ButtonInteraction, CommandInteraction, Interaction, ActionRowBuilder, ButtonBuilder, MessageComponent, MessageComponentCollectorOptions, MessageComponentInteraction, EmbedBuilder,   SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { leaderboard, mongoClient } from '../arbi';
import { connectToCollection, IGuide, ServerSettings } from '../general/util';

export const registerforTesting = false;
export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Gets the lastest leaderboard for guide submissions!')
    

export async function execute(interaction: ChatInputCommandInteraction, serverSettings?: ServerSettings) {
    await interaction.deferReply();
    
    const collection = await connectToCollection('guides', mongoClient);
    const guides = await collection.find<IGuide>({}).toArray();
    
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
    const embed = new EmbedBuilder({
        author: { name: `${numGuides} total pages with ${numPages} slides!` },
        fields: [{ name: `Elite Guide submitters leaderboard:`, value: `\`\`\`${leaderboardtext}\`\`\`` }]//{name: `Other guide submitters`,value:`\`\`\`${leaderboardtext2}\`\`\``}
    });
    const embed2 = new EmbedBuilder({

        fields: [{ name: `Other guide submitters`, value: `\`\`\`${leaderboardtext2}\`\`\`` }]
    });
    const embed3 = new EmbedBuilder({

        fields: [{ name: `Other guide submitters`, value: `\`\`\`${leaderboardtext3}\`\`\`` }]
    });
    console.log(leaderboardtext);
    console.log(leaderboardtext2);

    await interaction.followUp({ embeds: [embed, embed2, embed3] })
    return true;
}


export const usage = `/leaderboard`;