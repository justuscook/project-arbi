import { Message, ActionRowBuilder, ButtonBuilder, EmbedBuilder, EmbedImageData, MessageReaction, BaseMessageOptions, TextChannel, User, codeBlock, Colors, bold, MessageActionRowComponentBuilder, ChannelType } from "discord.js";
import { ButtonStyle } from 'discord-api-types/v10'
import { AddToFailedGuideSearches, AddToSuccessfulGuideSearches, leaderboard, mongoClient } from "../arbi";
import { connectToCollection, fuzzySearch, getInput, getLeaderboard, ICommandInfo, IGuide, IMessageEmbeds } from "../general/util";
import * as util from "../general/util";
import { content } from "googleapis/build/src/apis/content";

const commandFile: ICommandInfo = {
    name: 'guide',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        let row1 = new ActionRowBuilder<MessageActionRowComponentBuilder>;
        let row2 = new ActionRowBuilder<MessageActionRowComponentBuilder>;
        let showInServer = false;
        const embeds: IMessageEmbeds[] = [];
        let userToDM: User;
        const originalUser: User = message.author;
        let canDM = await util.canDM(message);
        let canShow = await util.canShow(message);
        //let input = util.getUserInput(message.content);
        let ogInput = input;
        //input = input.trimEnd().trimStart();
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
            const inbox = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Inbox')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://discord.com/channels/@me/${await (await message.author.createDM()).id}`)
                );

            const collection = await util.connectToCollection('guides', mongoClient);
            const guides = await collection.find<util.IGuide>({}).toArray();

            const phrases = ['early game', 'mid game', 'late game', 'late', 'mid', 'early', 'late game+', 'late game +', 'late game guide', 'late game+ guide'];
            let found: util.IGuide[];

            if ((input.toLowerCase().includes('list') || input === '') && !input.toLowerCase().includes('diabolist')) {
                const listStings = util.getGuideList(guides);
                const genGuidesEmbed = new EmbedBuilder()
                    .setTitle('List of general game guides by title:')
                    .setDescription(codeBlock(listStings[2]))
                    .setColor(Colors.Gold);

                const champEmbed1 = new EmbedBuilder()
                    .setTitle('List of all champion guides:')
                    .setDescription(codeBlock(listStings[0]))
                    .setColor(Colors.Gold);
                const champEmbed2 = new EmbedBuilder()
                    .setTitle('List of champion guides continued:')
                    .setDescription(codeBlock(listStings[1]))
                    .setColor(Colors.Gold);
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
                    const dmEmbed = new EmbedBuilder()
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

                const now = new Date();
                const addYear = new Date(now.setFullYear(now.getFullYear() + 1))
                const addMonth = new Date(addYear.setMonth(addYear.getMonth() + 1))

                AddToFailedGuideSearches(input,[], now, addMonth);//
                return true;
            }
            else {

                let foundsTags: string[] = [];
                for (const x of found) {
                    if (foundsTags.includes(x.tag[0])) { continue }
                    foundsTags.push(x.tag[0])
                }
                const now = new Date();
                const addYear = new Date(now.setFullYear(now.getFullYear() + 1))
                const addMonth = new Date(addYear.setMonth(addYear.getMonth() + 1))

                await AddToSuccessfulGuideSearches(input, foundsTags, now, addMonth);//foundsTags,now,addMonth
            }
            const first10orLess: util.IGuide[] = found.filter(x => found.indexOf(x) < 10)

            const blackSlideEmbed: EmbedBuilder = new EmbedBuilder()
                .setTitle('Blank slide')
                .setDescription('This is a short guide, nothing in this section!');
            const botblackSlideEmbed: EmbedBuilder = new EmbedBuilder()
                .setTitle('Blank slide')
                .setDescription('This is a short guide, nothing in this section!');
            const guideEmbeds: IMessageEmbeds[] = [];
            first10orLess.sort(util.SortByOrder('order'));
            for (const f of first10orLess) {
                const embeds: EmbedBuilder[] = [];
                for (const d of f.data) {
                    const embed = new EmbedBuilder();
                    const image: EmbedImageData = {
                        url: d.image
                    }
                    if (d.image !== undefined) embed.setImage(image.url);
                    embed.setTitle(d.label);
                    embed.setDescription(d.desc);

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
                embeds[2].setFooter({
                    text: `Page ${first10orLess.indexOf(f) + 1} of ${first10orLess.length}`
                }

                )
                guideEmbeds.push({
                    topEmbed: embeds[0],
                    midEmbed: (embeds[1]) ? embeds[1] : blackSlideEmbed,
                    botEmbed: embeds[2]
                })
            }
            //console.log(guideEmbeds);

            for (let a = 1; a <= ((first10orLess.length > 5) ? 5 : first10orLess.length); a++) {
                row1.addComponents(
                    new ButtonBuilder()
                        .setCustomId(a.toString())
                        .setLabel(a.toString())
                        .setStyle(ButtonStyle.Success)
                )
            };
            (row1.components[0] as ButtonBuilder).setStyle(ButtonStyle.Primary)

            if (first10orLess.length > 5) {
                for (let a = 6; a <= first10orLess.length; a++) {
                    row2.addComponents(
                        new ButtonBuilder()
                            .setCustomId(a.toString())
                            .setLabel(a.toString())
                            .setStyle(ButtonStyle.Success)
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
                    const dmEmbed = new EmbedBuilder()
                        .setDescription(`${message.author.toString()}${(showInServer) ? 'You can\'t show commands in this server.  ' : ''} I sent the guide I found to you, click the "Inbox" button below to check!`)


                    const dmAlert = await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, embeds: [dmEmbed], components: [inbox]
                    });

                    await util.guideButtonPagination(message.author.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);
                    if (message.channel.type !== ChannelType.DM) await util.delayDeleteMessages([dmAlert as Message], 60 * 1000, showInServer);
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
                    const dmEmbed = new EmbedBuilder()
                        .setDescription(`${message.author.toString()}${(showInServer) ? 'You can\'t show commands in this server.  ' : ''}  Guide(s) sent, check your "Inbox"!`)
                    //.setAuthor({ name: `${ogInput}` })
                    if (message.channel.type !== ChannelType.DM) {
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
            await util.handelError(err, message.author, commandFile.name, message.channel as TextChannel)
            return false;
        }
    }
}
export default commandFile;