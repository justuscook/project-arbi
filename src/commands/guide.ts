import { SlashCommandBuilder, bold, userMention } from '@discordjs/builders';
import { time } from 'console';
import exp from 'constants';
import { ApplicationCommandPermissionData, BufferResolvable, ButtonInteraction, CommandInteraction, DiscordAPIError, GuildChannel, GuildMember, GuildMemberRoleManager, Interaction, Message, MessageActionRow, MessageAttachment, MessageButton, MessageComponent, MessageComponentCollectorOptions, MessageComponentInteraction, MessageEmbed, MessageEmbedOptions, MessageSelectMenu, MessageSelectMenuOptions, TextChannel, User } from 'discord.js';
import { EmbedColor, IMessageEmbeds } from '../general/util'
import * as util from '../general/util';
import google, { GoogleApis } from 'googleapis';
import { rawListeners } from 'process';

export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('guide')
    .addStringOption(option => option
        .setName('input')
        .setDescription('Enter a champions name or game location.  Can also be \'show\' and @mentions.')
        .setRequired(true))
    .addBooleanOption(option => option
        .setDescription('Wether to show the command in the channel or not.')
        .setName('show_in_server')
        .setRequired(false)
    )
    .addUserOption(option => option
        .setName('user_to_dm')
        .setRequired(false)
        .setDescription('Only for Raid: SL offical server mods, DM\'s guides to users')
    )
    .setDescription('Search for guides by champion or dungeon name.')

export async function execute(interaction) {
    await interaction.deferReply();
    let row1: MessageActionRow = new MessageActionRow;
    let row2: MessageActionRow = new MessageActionRow;
    const embeds: IMessageEmbeds[] = [];
    let userToDM: User = interaction.options.getUser('user_to_dm');
    const originalUser: User = interaction.user;
    let canShowInServerOrDM = await util.canShowInServerOrDM(interaction);
    let input = interaction.options.getString('input');
    let showInServer = interaction.options.getBoolean('show_in_server');

    try {
        if (interaction.isCommand()) {
            if (input.toLowerCase().includes('show')) {
                input = util.removeShow(input);
                showInServer = true;
            }
            if (input.includes('<@!')) {
                let userID = input.substr(input.indexOf('<@!') + 3, 18)
                userToDM = await interaction.client.users.fetch(userID);
                input = input.replace(`<@!${userID}>`, '');
            }

            const response: google.Common.GaxiosResponse = await util.getSpreadSheetValues({
                spreadsheetId: util.guidesSheetID,
                auth: await util.getAuthToken(),
                sheetName: 'Form Responses 1',
            });
            const response2: google.Common.GaxiosResponse = await util.getSpreadSheetValues({
                spreadsheetId: util.guidesSheetID,
                auth: await util.getAuthToken(),
                sheetName: 'Form Responses 2',
            });
            let guides: util.IGuide[] = [];
            response.data.values.map((x) => {
                guides.push({
                    aprroved: x[0],
                    title: x[2],
                    champion: x[3],
                    stage: x[4],
                    rarity: x[5],
                    topSlide: x[6],
                    topImage: (x[7] !== '') ? x[7] : x[14],
                    midSlide: x[8],
                    midImage: (x[9] !== '') ? x[9] : x[15],
                    botSlide: x[10],
                    botImage: (x[11] !== '') ? x[11] : x[16]
                })
            });
            response2.data.values.map((x) => {
                guides.push({
                    aprroved: x[0],
                    title: x[2],
                    champion: x[3],
                    stage: x[4],
                    rarity: x[5],
                    topSlide: x[6],
                    topImage: (x[7] !== '') ? x[7] : x[14],
                    midSlide: x[8],
                    midImage: (x[9] !== '') ? x[9] : x[15],
                    botSlide: x[10],
                    botImage: (x[11] !== '') ? x[11] : x[16]
                })
            });
            guides = guides.filter(x => x.aprroved === 'TRUE');

            const found: util.IGuide[] = util.fuzzySearch(guides, input, ['champion']);
            if (found.length === 0) {
                await interaction.followUp(`There are no guides for ${bold(input)} yet!`);
                return;
            }
            for (const f of found) {
                const topImage = await util.getMessageAttacment(f.topImage);
                const topEmbed = new MessageEmbed()
                    .setDescription(f.topSlide)
                    .setTitle(f.title)
                    .setImage(`attachment://${topImage.name}`);
                const midImage = await util.getMessageAttacment(f.midImage);
                const midEmbed = new MessageEmbed()
                    .setDescription(f.midSlide)
                    .setTitle(f.title)
                    .setImage(`attachment://${midImage.name}`);
                let botEmbed = new MessageEmbed();
                let botImage;
                if (f.botImage !== null) {
                    botImage = await util.getMessageAttacment(f.botImage);
                    botEmbed = new MessageEmbed()
                        .setDescription(f.botSlide)
                        .setTitle(f.title)
                        .setImage(`attachment://${botImage.name}`)
                        .setFooter(`Page ${found.indexOf(f) + 1}`);
                }
                else {
                    botEmbed = new MessageEmbed()
                        .setDescription(f.botSlide)
                        .setTitle(f.title)
                        .setFooter(`Page ${found.indexOf(f) + 1}`);
                }
                embeds.push({
                    topEmbed: topEmbed,
                    topImage: topImage,
                    midEmbed: midEmbed,
                    midImage: midImage,
                    botEmbed: botEmbed,
                    botImage: (botImage) ? botImage : ''
                })
            }
            const inbox = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setLabel('Inbox')
                        .setStyle('LINK')
                        .setURL(`https://discord.com/channels/@me/${await (await interaction.user.createDM()).id}`)
                );
            const first10orLess = found.filter(x => found.indexOf(x) < 10)
            for (let a = 1; a <= ((first10orLess.length > 5) ? 5 : first10orLess.length); a++) {
                row1.addComponents(
                    new MessageButton()
                        .setCustomId(a.toString())
                        .setLabel(a.toString())
                        .setStyle('SUCCESS')
                )
            };

            if (first10orLess.length > 5) {
                for (let a = 6; a <= first10orLess.length; a++) {
                    row2.addComponents(
                        new MessageButton()
                            .setCustomId(a.toString())
                            .setLabel(a.toString())
                            .setStyle('SUCCESS')
                    )
                };
                if (userToDM !== null && canShowInServerOrDM) {
                    const commandMessage = await userToDM.send({ embeds: [embeds[0].topEmbed, embeds[0].midEmbed, embeds[0].botEmbed], files: [embeds[0].topImage, embeds[0].midImage, embeds[0].botImage], components: [row1, row2] });
                    interaction.user.id = userToDM.id;
                    interaction.channel.id = await (await userToDM.createDM()).id
                    await util.buttonPagination(userToDM.id, commandMessage as Message, embeds);
                    const guidesDMed = await interaction.followUp(`I am sending the guide(s) to ${userMention(userToDM.id)}\'s DM\'s!`)
                    util.delayDeteleMessage(guidesDMed);
                    return;
                }
                else if (canShowInServerOrDM && showInServer === true) {
                    const commandMessage = await interaction.followUp({ embeds: [embeds[0].topEmbed, embeds[0].midEmbed, embeds[0].botEmbed], files: [embeds[0].topImage, embeds[0].midImage, embeds[0].botImage], components: [row1, row2] });
                    await util.buttonPagination(interaction.user.id, commandMessage as Message, embeds);
                    util.delayDeteleMessage(commandMessage)
                    return;
                }
                else {
                    if (userToDM !== null) {
                        const cantDM = await interaction.followUp(`${userMention(interaction.user.id)}, you can't send DM's, only mod in the offical Raid: SL server can.`)
                        util.delayDeteleMessage(cantDM);
                        return;
                    }
                    const dmAlert = await interaction.followUp({ content: `${userMention(interaction.user.id)}${(showInServer) ? 'You can\'t show commands in this server.  ' : ''} I sent the guide I found to you, click the "Inbox" button below to check!`, components: [inbox] });
                    const commandMessage = await interaction.user.send({ embeds: [embeds[0].topEmbed, embeds[0].midEmbed, embeds[0].botEmbed], files: [embeds[0].topImage, embeds[0].midImage, embeds[0].botImage], components: [row1, row2] });
                    await util.buttonPagination(interaction.user.id, commandMessage as Message, embeds);
                    util.delayDeteleMessage(commandMessage)
                    util.delayDeteleMessage(dmAlert, 15 * 1000)
                    return;
                }
            }
            else {
                if (userToDM !== null && canShowInServerOrDM) {
                    const commandMessage = await userToDM.send({ embeds: [embeds[0].topEmbed, embeds[0].midEmbed, embeds[0].botEmbed], files: [embeds[0].topImage, embeds[0].midImage, embeds[0].botImage], components: [row1] });
                    interaction.user.id = userToDM.id;
                    interaction.channel.id = await (await userToDM.createDM()).id
                    await util.buttonPagination(userToDM.id, commandMessage as Message, embeds);
                    const guidesDMed = await interaction.followUp({ content: util.simpleEmbed(`I am sending the guide(s) to ${userMention(userToDM.id)}\'s DM\'s!`) })
                    util.delayDeteleMessage(guidesDMed, 15 * 1000);
                    return;
                }
                else if (canShowInServerOrDM && showInServer === true) {
                    const commandMessage = await interaction.followUp({ embeds: [embeds[0].topEmbed, embeds[0].midEmbed, embeds[0].botEmbed], files: [embeds[0].topImage, embeds[0].midImage, embeds[0].botImage], components: [row1] });
                    await util.buttonPagination(interaction.user.id, commandMessage as Message, embeds);
                    util.delayDeteleMessage(commandMessage)
                    return;
                }
                else {
                    if (userToDM !== null) {
                        const cantDM = await interaction.followUp(`${userMention(interaction.user.id)}, you can't send DM's, only mod in the offical Raid: SL server can.`)
                        util.delayDeteleMessage(cantDM);
                        return;
                    }
                    const dmAlert = await interaction.followUp({ content: `${userMention(interaction.user.id)}${(showInServer) ? 'You can\'t show commands in this server.  ' : ''} I sent the guide I found to you, click the "Inbox" button below to check!`, components: [inbox] });
                    const commandMessage = await interaction.user.send({ embeds: [embeds[0].topEmbed, embeds[0].midEmbed, embeds[0].botEmbed], files: [embeds[0].topImage, embeds[0].midImage, embeds[0].botImage], components: [row1] });
                    await util.buttonPagination(interaction.user.id, commandMessage as Message, embeds);
                    util.delayDeteleMessage(commandMessage);
                    util.delayDeteleMessage(dmAlert, 15 * 1000);
                    return;
                }
            }
        }
    }
    catch (error) {
        console.log(error)
        if (error.code === 50007) {
            await interaction.followUp({ content: `${userMention(originalUser.id)}, ${userMention(userToDM.id)} Has direct messages disabled.  They can either turn them on just for this server or globlally.  Find out how [here](https://support.discord.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings-).` });
            return;
        } else {
            await interaction.followUp({ content: 'There was an issue with the command, it has been logged and we are working on a fix!' })
            return;
        }
    }
}
