import { Message, ActionRowBuilder, ButtonBuilder, EmbedBuilder, MessageActionRowComponentBuilder, ButtonStyle, bold, userMention, ChannelType } from "discord.js";
import { logger, mongoClient } from "../arbi";
import { canDM, canShow, connectToCollection, delayDeleteMessages, fuzzySearch, getSkillsEmbeds, IChampionInfo, ICommandInfo, inboxLinkButton, removeShow, skillsButtonPagination } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'skills',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        try {
            let showInServer = false;
            let row1: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder<MessageActionRowComponentBuilder>;
            let allowDM = await canDM(message);
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

                const skillsEmbeds: EmbedBuilder[] = getSkillsEmbeds(champ, false);
                if (otherMatches !== '') {
                    for (const s of skillsEmbeds) {
                        s.setFooter({
                            text: `Not the right champion? Try one of these searches: ${otherMatches}`
                        })
                    }
                }
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
                    const skillsMessage = await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, embeds: [skillsEmbeds[0]], components: [row1]
                    });
                    await skillsButtonPagination(message.author.id, skillsMessage as Message, skillsEmbeds);
                    await delayDeleteMessages([skillsMessage as Message])

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
                        const skillsDM = await message.author.send({ embeds: [skillsEmbeds[0]], components: [row1] });
                        await skillsButtonPagination(message.author.id, skillsDM, skillsEmbeds);
                    }
                    else {
                        const skillsDM = await message.reply({
                            allowedMentions: {
                                repliedUser: false
                            }, embeds: [skillsEmbeds[0]], components: [row1]
                        });
                        await skillsButtonPagination(message.author.id, skillsDM as Message, skillsEmbeds);
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
            console.log(err)
            logger.error(err);
            return false;
        }
    }
}
export default commandFile;