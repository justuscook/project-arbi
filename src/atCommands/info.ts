import { ButtonStyle, Message, ActionRowBuilder, ButtonBuilder, EmbedBuilder, MessageActionRowComponent, MessageActionRowComponentBuilder, bold, userMention, ChannelType } from "discord.js";
import { logger, mongoClient } from "../arbi";
import { canShow, connectToCollection, delayDeleteMessages, fuzzySearch, getColorByRarity, getFactionImage, getSkillsEmbeds, IChampionInfo, ICommandInfo, inboxLinkButton, nonchachedImage, removeShow, skillsButtonPagination } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'info',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        try {
            let showInServer = false;
            let row1: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder<MessageActionRowComponentBuilder>;
            //let allowDM = await canDM(interaction);
            let allowShow = await canShow(message);
            let champName = input;
            if (champName.toLowerCase().includes('show')) {
                showInServer = true,
                    champName = removeShow(champName);
            }

            const collection = await connectToCollection('champion_info', mongoClient);
            const champs = await collection.find<IChampionInfo>({}).toArray();

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
                let embed: EmbedBuilder;
                embed = new EmbedBuilder({
                    title: (champ.name),
                    color: getColorByRarity(champ.rarity),
                    thumbnail: {
                        url: getFactionImage(champ.faction)
                    },
                    image: {
                        url: `https://raw.githubusercontent.com/justuscook/rsl-assets/master/RSL-Assets/HeroAvatarsWithBorders/${(champ.rarity !== 'Common') ? champ.id - 6 : champ.id}.png${nonchachedImage()}`
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
                    embed.addFields({ name: 'Aura:', value: champ.aura, inline: false });
                }
                embed.addFields({name: 'Books to max skills:', value: champ.totalBooks, inline: false});

                if (otherMatches !== '') {
                    embed.data.footer = {
                        text: `Not the right champion? Try one of these searches: ${otherMatches}`
                    }
                }
                const skillsEmbeds: EmbedBuilder[] = getSkillsEmbeds(champ, false);
                let i = 1;
                for (const s of champ.skills) {
                    row1.addComponents(
                        new ButtonBuilder()
                            .setStyle((i === 1) ? ButtonStyle.Primary : ButtonStyle.Success)
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
                    const skillsMessage = await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, embeds: [skillsEmbeds[0]], components: [row1]
                    });
                    await skillsButtonPagination(message.author.id, skillsMessage as Message, skillsEmbeds);
                    await delayDeleteMessages([statsMessage as Message, skillsMessage as Message])

                }
                else {
                    const inbox = await inboxLinkButton(message.author);
                    const dmWarnEmbed: EmbedBuilder = new EmbedBuilder(
                        {
                            description: `${userMention((await message.author.fetch()).id)}, ${(allowShow === false && showInServer === true) ? `you can't show commands in this server, only mod in the offical Raid: SL server can.  ` : ``}I have sent the output in a DM, click the button below to check your inbox!`,
                        }
                    )
                    if (message.channel.type !== ChannelType.DM) {
                        const dmWarn = await message.reply({
                            allowedMentions: {
                                repliedUser: false
                            }, embeds: [dmWarnEmbed], components: [inbox]
                        });
                        await delayDeleteMessages([dmWarn as Message], 60 * 1000)
                        const _ = await message.author.send({ embeds: [embed] });
                        const skillsDM = await message.author.send({ embeds: [skillsEmbeds[0]], components: [row1] });
                        await skillsButtonPagination(message.author.id, skillsDM, skillsEmbeds);
                    }
                    else {
                        const _ = await message.reply({
                            allowedMentions: {
                                repliedUser: false
                            }, embeds: [embed]
                        });
                        const skillsDM = await message.reply({
                            allowedMentions: {
                                repliedUser: false
                            }, embeds: [skillsEmbeds[0]], components: [row1]
                        });
                        await skillsButtonPagination(message.author.id, skillsDM as Message, skillsEmbeds);
                    }

                }
                return true;
            }
            else {
                const fail = await message.reply({
                    allowedMentions: {
                        repliedUser: false
                    }, content: `${userMention((await message.author.fetch()).id)} I didn't find any matches for your search ${bold(champName)}, please try again.`
                })
                return true;
            }
        }
        catch (err) {
            console.log(err)
            logger.error(err);
            return false;
        }
    }
}
export default commandFile;