import { bold, userMention } from "@discordjs/builders";
import { Message, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { logger } from "../arbi";
import { canDM, canShow, connectToCollection, connectToDB, delayDeleteMessages, fuzzySearch, getColorByRarity, getFactionImage, getInput, getSkillsEmbeds, getUserInput, IChampionInfo, ICommandInfo, IGuide, inboxLinkButton, removeShow, skillsButtonPagination } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'skills',
    execute: async (message: Message): Promise<boolean> => {
        try {
            let showInServer = false;
            let row1: MessageActionRow = new MessageActionRow;
            let allowDM = await canDM(message);
            let allowShow = await canShow(message);
            let champName = getUserInput(message.content)
            if (champName.toLowerCase().includes('show')) {
                showInServer = true,
                    champName = removeShow(champName);
            }
            const mongoClient = await connectToDB();
            const collection = await connectToCollection('champion_info', mongoClient);
            const champs = await collection.find<IChampionInfo>({}).toArray();
            await mongoClient.close()
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

                const skillsEmbeds: MessageEmbed[] = getSkillsEmbeds(champ, false);
                if (otherMatches !== '') {
                    for (const s of skillsEmbeds) {
                        s.footer = {
                            text: `Not the right champion? Try one of these searches: ${otherMatches}`
                        }
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
            logger.error(err);
            return false;
        }
    }
}
export default commandFile;