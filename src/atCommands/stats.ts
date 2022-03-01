import { bold, userMention } from "@discordjs/builders";
import { Message, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { logger } from "../arbi";
import { canShow, connectToCollection, connectToDB, delayDeleteMessages, fuzzySearch, getColorByRarity, getFactionImage, getInput, getUserInput, IChampionInfo, ICommandInfo, IGuide, inboxLinkButton, removeShow } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'stats',
    execute: async (message: Message): Promise<boolean> => {
        try {
            let showInServer = false;
            let row1: MessageActionRow = new MessageActionRow;
            //let allowDM = await canDM(interaction);
            let allowShow = await canShow(message);
            let champName = getUserInput(message.content)
            if (champName.toLowerCase().includes('show')) {
                showInServer = true,
                    champName = removeShow(champName);
            }
            const mongoClient = await connectToDB();
            const collection = await connectToCollection('champion_info', mongoClient);
            const champs = await collection.find<IChampionInfo>({}).toArray();
            await mongoClient.close();
            const found: IChampionInfo[] = fuzzySearch(champs, champName, ['name']);

            if (found.length > 0) {
                const champ: IChampionInfo = found[0];
                let otherMatches: string = '';
                if (found.length > 1) {
                    for (let i = 1; i <= 3; i++) {
                        try {
                            if (i === 3) {
                                otherMatches += `${found[i].name}.`
                            }
                            else otherMatches += `${found[i].name}, `
                        }
                        catch {
                            break;
                        }
                    }
                }
                let embed: MessageEmbed;
                embed = new MessageEmbed({
                    title: (champ.name),
                    color: getColorByRarity(champ.rarity),
                    thumbnail: {
                        url: getFactionImage(champ.faction)
                    },
                    image: {
                        url: `https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/newAvatars/${(champ.id) - 6}.png`
                    },
                    fields: [{
                        name: 'Faction:',
                        value: champ.faction,
                        inline: true
                    },
                    {
                        name: 'Type:',
                        value: champ.type,
                        inline: true
                    },
                    {
                        name: 'Affinity:',
                        value: champ.affinity,
                        inline: true
                    },
                    {
                        name: 'Rarity:',
                        value: champ.rarity,
                        inline: true
                    },
                    {
                        name: 'HP:',
                        value: champ.hp,
                        inline: true
                    },
                    {
                        name: 'Attack:',
                        value: champ.atk,
                        inline: true
                    },
                    {
                        name: 'Defense:',
                        value: champ.def,
                        inline: true
                    },
                    {
                        name: 'Critical Rate:',
                        value: champ.crate,
                        inline: true
                    },
                    {
                        name: 'Crititcal Damage:',
                        value: champ.cdamage,
                        inline: true
                    },
                    {
                        name: 'Speed:',
                        value: champ.spd,
                        inline: true
                    },
                    {
                        name: 'Resistance:',
                        value: champ.res,
                        inline: true
                    },
                    {
                        name: 'Accuracy:',
                        value: champ.acc,
                        inline: true
                    }],

                });
                if (champ.aura) {
                    embed.addField('Aura:', champ.aura, false);
                }
                embed.addField('Books to max skills:', champ.totalBooks, false);

                if (otherMatches !== '') {
                    embed.footer = {
                        text: `Not the right champion? Try one of these searches: ${otherMatches}`
                    }
                }

                let i = 1;
                for (const s of champ.skills) {
                    row1.addComponents(
                        new MessageButton()
                            .setStyle((i === 1) ? 'PRIMARY' : 'SUCCESS')
                            .setCustomId(`${i}`)
                            .setLabel(`A${i} - ${s.name}`)
                    )
                    i++;
                }
                if (allowShow && showInServer === true) {
                    const statsMessage = await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, embeds: [embed]
                    });
                    await delayDeleteMessages([statsMessage as Message])

                }
                else {
                    const inbox = await inboxLinkButton(message.author);
                    const dmWarnEmbed: MessageEmbed = new MessageEmbed(
                        {
                            description: `${userMention((await message.author.fetch()).id)}, ${(allowShow === false && showInServer === true) ? `you can't show commands in this server, only mod in the offical Raid: SL server can.  ` : ``}I have sent the output in a DM, click the button below to check your inbox!`,
                        }
                    )
                    if (message.channel.type !== 'DM') {
                        const dmWarn = await message.reply({
                            allowedMentions: {
                                repliedUser: false
                            }, embeds: [dmWarnEmbed], components: [inbox]
                        });
                        await delayDeleteMessages([dmWarn as Message], 60 * 1000)
                        const _ = await message.author.send({ embeds: [embed] });
                    }
                    else {
                        const _ = await message.reply({
                            allowedMentions: {
                                repliedUser: false
                            }, embeds: [embed]
                        });
                    }

                }
            }
            else {

                const fail = await message.reply({
                    allowedMentions: {
                        repliedUser: false
                    }, content: `${userMention((await message.author.fetch()).id)} I didn't find any matches for your search ${bold(champName)}, please try again.`
                })
            }
            return true;
        }
        catch (err) {
            logger.error(err);
            return false;
        }
    }
}
export default commandFile;