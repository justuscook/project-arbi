import { bold, codeBlock, Embed, userMention } from "@discordjs/builders";
import { Message, MessageActionRow, MessageButton, MessageEmbed, MessageEmbedImage, MessageReaction, ReplyMessageOptions, User } from "discord.js";
import { AddToFailedGuideSearches, AddToSuccessfulGuideSearches, leaderboard } from "../arbi";
import { connectToCollection, connectToDB, fuzzySearch, getInput, getLeaderboard, ICommandInfo, IGuide, IMessageEmbeds } from "../general/util";
import * as util from "../general/util";
import { content } from "googleapis/build/src/apis/content";

const commandFile: ICommandInfo = {
    name: 'guide',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        let row1: MessageActionRow = new MessageActionRow;
        let row2: MessageActionRow = new MessageActionRow;
        let showInServer = false;
        const embeds: IMessageEmbeds[] = [];
        let userToDM: User;
        const originalUser: User = message.author;
        let canDM = await util.canDM(message);
        let canShow = await util.canShow(message);
        //let input = util.getUserInput(message.content);
        let ogInput = message.content;
        if (input === null) input = 'list';
        if (input.toLowerCase().includes('show')) {
            input = util.removeShow(input).trimEnd().trimStart();
            showInServer = true;
        }//const regexCheck = /<@(!|)userID>/gim;
        //if (regexCheck.exec(x) !== null) {}
        if (input.includes('<@')) {
            input = input.replace(/!/g, '');
            const data = input.match(new RegExp("(.+) <@([^>]+)"));
            const userID = data[2];
            userToDM = await message.client.users.fetch(userID);
            input = data[1];
        }
        console.log(input);
        try {
            const inbox = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setLabel('Inbox')
                        .setStyle('LINK')
                        .setURL(`https://discord.com/channels/@me/${await (await message.author.createDM()).id}`)
                );
            const mongoClient = await util.connectToDB();
            const collection = await util.connectToCollection('guides', mongoClient);
            const guides = await collection.find<util.IGuide>({}).toArray();
            await mongoClient.close();
            const phrases = ['early game', 'mid game', 'late game', 'late', 'mid', 'early', 'late game+', 'late game +', 'late game guide', 'late game+ guide'];
            let found: util.IGuide[];

            if ((input.toLowerCase().includes('list') || input === '') && !input.toLowerCase().includes('diabolist')) {
                const listStings = util.getGuideList(guides);
                const genGuidesEmbed = new MessageEmbed()
                    .setTitle('List of general game guides by title:')
                    .setDescription(codeBlock(listStings[2]))
                    .setColor('GOLD');

                const champEmbed1 = new MessageEmbed()
                    .setTitle('List of all champion guides:')
                    .setDescription(codeBlock(listStings[0]))
                    .setColor('GOLD');
                const champEmbed2 = new MessageEmbed()
                    .setTitle('List of champion guides continued:')
                    .setDescription(codeBlock(listStings[1]))
                    .setColor('GOLD');
                if (canShow && showInServer) {
                    const listMessage = await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, embeds: [genGuidesEmbed, champEmbed1, champEmbed2]
                    });
                    await util.delayDeleteMessages([listMessage as Message]);
                    return true;
                }
                else {
                    const dmEmbed = new MessageEmbed()
                        .setDescription(`${message.author.toString()}${(showInServer) ? `You can\'t show commands in this server.` : ''} Guide(s) sent, check your "Inbox"!`)
                    //.setAuthor({ name: `${ogInput}` })

                    const dmAlert = await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        },
                        embeds: [dmEmbed], components: [inbox]
                    });
                    const listMessage = await message.author.send({ embeds: [genGuidesEmbed, champEmbed1, champEmbed2] });
                    await util.delayDeleteMessages([dmAlert as Message], 60 * 1000, showInServer);


                }
                return true;
            }
            if (phrases.includes(input)) {
                found = util.fuzzySearch(guides, input, ['tag']);
            }
            else {
                found = util.fuzzySearch(guides, input, ['tag', 'title']);
            }
            if (found.length === 0) {
                await message.reply({
                    allowedMentions: {
                        repliedUser: false
                    },
                    content: `There are no guides for ${bold(input)} yet!`
                })

                AddToFailedGuideSearches(input);
                return true;
            }
            else {
                AddToSuccessfulGuideSearches(input);
            }
            const first10orLess: util.IGuide[] = found.filter(x => found.indexOf(x) < 10)

            const blackSlideEmbed: MessageEmbed = new MessageEmbed()
                .setTitle('Blank slide')
                .setDescription('This is a short guide, nothing in this section!');
            const botblackSlideEmbed: MessageEmbed = new MessageEmbed()
                .setTitle('Blank slide')
                .setDescription('This is a short guide, nothing in this section!');
            const guideEmbeds: IMessageEmbeds[] = [];
            first10orLess.sort(util.SortByOrder('order'));
            for (const f of first10orLess) {
                const embeds: MessageEmbed[] = [];
                for (const d of f.data) {
                    const embed = new MessageEmbed();
                    const image: MessageEmbedImage = {
                        url: d.image,
                    }
                    if (d.image !== undefined) embed.image = image;
                    embed.title = d.label;
                    embed.description = d.desc;

                    embeds.push(embed)
                }
                let authors: User[];
                try {
                    authors = await util.GetAuthor(message.client, f.author);
                }
                catch (err) {
                    embeds.pop();
                    //authors = [await interaction.client.users.fetch('888450658397741057')]
                    break;
                }
                let authorsNames: string = '';
                for (const a of authors) {
                    authorsNames += `${a.username}#${a.discriminator} `;
                }
                embeds[0].setAuthor({
                    name: authorsNames,
                    iconURL: (authors.length > 1) ? 'https://cdn.discordapp.com/attachments/737622176995344485/892856095624810536/Share-damage-2.png' : authors[0].avatarURL()
                }
                );
                embeds[0].setTitle(f.title);
                if (embeds[1]) {
                    embeds[1].setTitle(f.title);
                }
                if (!embeds[2]) {
                    embeds[2] = botblackSlideEmbed;
                }
                embeds[2].footer = {
                    text: `Page ${first10orLess.indexOf(f) + 1} of ${first10orLess.length}`
                }
                guideEmbeds.push({
                    topEmbed: embeds[0],
                    midEmbed: (embeds[1]) ? embeds[1] : blackSlideEmbed,
                    botEmbed: embeds[2]
                })
            }
            //console.log(guideEmbeds);

            for (let a = 1; a <= ((first10orLess.length > 5) ? 5 : first10orLess.length); a++) {
                row1.addComponents(
                    new MessageButton()
                        .setCustomId(a.toString())
                        .setLabel(a.toString())
                        .setStyle('SUCCESS')
                )
            };
            (row1.components[0] as MessageButton).setStyle('PRIMARY')

            if (first10orLess.length > 5) {
                for (let a = 6; a <= first10orLess.length; a++) {
                    row2.addComponents(
                        new MessageButton()
                            .setCustomId(a.toString())
                            .setLabel(a.toString())
                            .setStyle('SUCCESS')
                    )
                };
                if (userToDM && canDM) {
                    console.log('get to here before crash')
                    const topCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].topEmbed] });
                    const midCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].midEmbed] });
                    const botCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].botEmbed], components: [row1, row2] });
                    //message.author.id = userToDM.id;
                    //interaction.channel.id = await (await userToDM.createDM()).id;
                    const guideSend = await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, content: `I am sending the guide(s) to ${userToDM.toString()}\'s DM\'s!`
                    });

                    await util.guideButtonPagination(userToDM.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);
                    await util.delayDeleteMessages([guideSend as Message], 60 * 1000);
                    return true;
                }
                else if (canShow && showInServer === true) {
                    const topCommandMessage = await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, embeds: [guideEmbeds[0].topEmbed]
                    });
                    const midCommandMessage = await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, embeds: [guideEmbeds[0].midEmbed]
                    });
                    const botCommandMessage = await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, embeds: [guideEmbeds[0].botEmbed], components: [row1, row2]
                    });
                    await util.guideButtonPagination(message.author.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);
                    return true;
                }
                else {
                    if (userToDM) {
                        await message.reply({
                            allowedMentions: {
                                repliedUser: false
                            }, content: `${message.author.toString()}, you can't send DM's, only mod in the offical Raid: SL server can.`
                        })
                        return true;
                    }
                    console.log('got here before crash 2')
                    const topCommandMessage = await message.author.send({ embeds: [guideEmbeds[0].topEmbed] });
                    const midCommandMessage = await message.author.send({ embeds: [guideEmbeds[0].midEmbed] });
                    const botCommandMessage = await message.author.send({ embeds: [guideEmbeds[0].botEmbed], components: [row1, row2] });
                    const dmEmbed = new MessageEmbed()
                        .setDescription(`${message.author.toString()}${(showInServer) ? 'You can\'t show commands in this server.  ' : ''} I sent the guide I found to you, click the "Inbox" button below to check!`)


                    const dmAlert = await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, embeds: [dmEmbed], components: [inbox]
                    });

                    await util.guideButtonPagination(message.author.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);
                    if (message.channel.type !== 'DM') await util.delayDeleteMessages([dmAlert as Message], 60 * 1000, showInServer);
                    return true;

                }
            }
            else {
                if (userToDM && canDM) {
                    console.log('got here before crash 3')
                    const topCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].topEmbed] });
                    const midCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].midEmbed] });
                    const botCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].botEmbed], components: [row1] });
                    //message.author.id = userToDM.id;
                    //interaction.channel.id = await (await userToDM.createDM()).id;
                    const guideSend = await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, content: `I am sending the guide(s) to ${userToDM.toString()}\'s DM\'s!`
                    })

                    await util.guideButtonPagination(userToDM.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);
                    await util.delayDeleteMessages([guideSend as Message], 60 * 1000);
                    return true;
                }
                else if (canShow && showInServer === true) {
                    const topCommandMessage = await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, embeds: [guideEmbeds[0].topEmbed]
                    });
                    const midCommandMessage = await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, embeds: [guideEmbeds[0].midEmbed]
                    });
                    const botCommandMessage = await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, embeds: [guideEmbeds[0].botEmbed], components: [row1]
                    });
                    await util.guideButtonPagination(message.author.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);

                    return true;
                }
                else {
                    if (userToDM) {
                        await message.reply({
                            allowedMentions: {
                                repliedUser: false
                            }, content: `${message.author.toString()}, you can't send DM's, only mod in the offical Raid: SL server can.`
                        })
                        return true;
                    }
                    console.log('got here before crash 4')
                    const topCommandMessage = await message.author.send({ embeds: [guideEmbeds[0].topEmbed] });
                    const midCommandMessage = await message.author.send({ embeds: [guideEmbeds[0].midEmbed] });
                    const botCommandMessage = await message.author.send({ embeds: [guideEmbeds[0].botEmbed], components: [row1] });
                    const dmEmbed = new MessageEmbed()
                        .setDescription(`${message.author.toString()}${(showInServer) ? 'You can\'t show commands in this server.  ' : ''}  Guide(s) sent, check your "Inbox"!`)
                    //.setAuthor({ name: `${ogInput}` })
                    if (message.channel.type !== 'DM') {
                        const dmAlert = await message.reply({
                            allowedMentions: {
                                repliedUser: false
                            }, embeds: [dmEmbed], components: [inbox]
                        });
                        await util.delayDeleteMessages([dmAlert as Message], 60 * 1000, showInServer);
                    }
                    await util.guideButtonPagination(message.author.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);

                    return true;
                }
            }
        }
        catch (err) {
            await message.reply({
                allowedMentions: {
                    repliedUser: false
                }, content: 'There was an error in your guide search, it is logged and we are looking into it!  Please use /support and ask for help with your issue if it keeps happening.'
            });
            console.log(err)
        }
    }
}
export default commandFile;