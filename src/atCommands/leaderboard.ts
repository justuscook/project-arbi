import { bold, userMention } from "@discordjs/builders";
import { Message, MessageActionRow, MessageButton, MessageComponentInteraction, MessageEmbed } from "discord.js";
import { totalmem } from "os";
import { leaderboard } from "../arbi";
import { Champion, IShardData, msToTime } from "../general/IShardData";
import { clipText, connectToCollection, connectToDB, fuzzySearch, getInput, ICommandInfo, IGuide, Timeout } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'leaderboard',
    execute: async (message: Message): Promise<boolean> => {
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

        await message.reply({
            allowedMentions: {
                repliedUser: false
            }, embeds: [embed, embed2, embed3]
        })
        return true;
    }
}
export default commandFile;