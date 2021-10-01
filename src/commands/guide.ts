import { SlashCommandBuilder, bold, userMention, Embed } from '@discordjs/builders';
import { CommandInteraction, Message, MessageActionRow, MessageButton, MessageEmbed, MessageEmbedImage, User } from 'discord.js';
import { IMessageEmbeds } from '../general/util'
import * as util from '../general/util';
import { MongoClient } from 'mongodb';
import { dbpass } from '../config.json';

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

export async function execute(interaction: CommandInteraction) {
    await interaction.deferReply();
    let row1: MessageActionRow = new MessageActionRow;
    let row2: MessageActionRow = new MessageActionRow;
    const embeds: IMessageEmbeds[] = [];
    let userToDM: User = interaction.options.getUser('user_to_dm');
    const originalUser: User = interaction.user;
    let canShowInServerOrDM = await util.canShowInServerOrDM(interaction);
    let input: string = await interaction.options.getString('input');
    let showInServer = await interaction.options.getBoolean('show_in_server');
    if (input.toLowerCase().includes('show')) {
        input = util.removeShow(input).trimEnd().trimStart();
        showInServer = true;
    }
    const uri = `mongodb+srv://arbi:${dbpass}@arbi.g6e2c.mongodb.net/Arbi?retryWrites=true&w=majority`;
    const mongoClient: MongoClient = new MongoClient(uri);
    try {
        const inbox = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setLabel('Inbox')
                    .setStyle('LINK')
                    .setURL(`https://discord.com/channels/@me/${await (await interaction.user.createDM()).id}`)
            );
        await mongoClient.connect();
        const collection = await mongoClient.db('project-arbi').collection('guides');
        const guides = await collection.find<util.IGuide>({}).toArray();
        const phrases = ['early game', 'mid game', 'late game', 'late', 'mid', 'early', 'late game+', 'late game +', 'late game guide', 'late game+ guide'];
        let found: util.IGuide[];
        if (input.toLowerCase().includes('list')) {
            const listStings = util.getGuideList(guides);
            const genGuidesEmbed = new MessageEmbed()
                .setTitle('List of general game guides by title:')
                .setDescription(listStings[2])
                .setColor('BLURPLE');

            const champEmbed1 = new MessageEmbed()
                .setTitle('List of all champion guides:')
                .setDescription(listStings[0])
                .setColor('GOLD');
            const champEmbed2 = new MessageEmbed()
                .setTitle('List of champion guides continued:')
                .setDescription(listStings[1])
                .setColor('GOLD');
            if (canShowInServerOrDM && showInServer) {
                const listMessage = await interaction.followUp({ embeds: [genGuidesEmbed, champEmbed1, champEmbed2] });
                await util.delayDeleteMessage(listMessage as Message);
                return;
            }
            else {
                const dmAlert = await interaction.followUp({ content: `${userMention(interaction.user.id)}${(showInServer) ? 'You can\'t show commands in this server.' : ''} I sent the list of guides to you, click the "Inbox" button below to check!`, components: [inbox] });
                const listMessage = await interaction.user.send({ embeds: [genGuidesEmbed, champEmbed1, champEmbed2] });
                await util.delayDeleteMessage(dmAlert as Message);
            }
            return;
        }
        if (phrases.includes(input)) {
            found = util.fuzzySearch(guides, input, ['tag']);
        }
        else {
            found = util.fuzzySearch(guides, input, ['tag', 'title']);
        }
        if (found.length === 0) {
            await interaction.followUp(`There are no guides for ${bold(input)} yet!`);
            return;
        }
        const first10orLess: util.IGuide[] = found.filter(x => found.indexOf(x) < 10)

        const blackSlideEmbed: MessageEmbed = new MessageEmbed()
            .setTitle('Blank slide')
            .setDescription('This is a short guide, nothing in this section!');
        const guideEmbeds: IMessageEmbeds[] = [];

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
                embed.footer = {
                    text: `Page ${first10orLess.indexOf(f) + 1} of ${first10orLess.length}`
                }
                embeds.push(embed)
            }
            const authors = await util.GetAuthor(interaction.client, f.author);
            let authorsNames: string = '';
            for (const a of authors) {
                authorsNames += `${a.username}#${a.discriminator} `;
            }
            embeds[0].setAuthor(authorsNames, (authors.length > 1) ? 'https://cdn.discordapp.com/attachments/737622176995344485/892856095624810536/Share-damage-2.png' : authors[0].avatarURL()
            );
            embeds[0].setTitle(f.title);
            embeds[1].setTitle(f.title);
            guideEmbeds.push({
                topEmbed: embeds[0],
                midEmbed: embeds[1],
                botEmbed: (embeds[2]) ? embeds[2] : blackSlideEmbed
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
            if (userToDM !== null && canShowInServerOrDM) {
                const topCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].topEmbed] });
                const midCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].midEmbed] });
                const botCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].botEmbed], components: [row1, row2] });
                interaction.user.id = userToDM.id;
                interaction.channel.id = await (await userToDM.createDM()).id;
                const guideSend = await interaction.followUp({ content: `I am sending the guide(s) to ${userMention(userToDM.id)}\'s DM\'s!` });
                await util.delayDeleteMessage(guideSend as Message, 60 * 1000);
                await util.buttonPagination(userToDM.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);
                return;
            }
            else if (canShowInServerOrDM && showInServer === true) {
                const topCommandMessage = await interaction.followUp({ embeds: [guideEmbeds[0].topEmbed] });
                const midCommandMessage = await interaction.followUp({ embeds: [guideEmbeds[0].midEmbed] });
                const botCommandMessage = await interaction.followUp({ embeds: [guideEmbeds[0].botEmbed], components: [row1, row2] });
                await util.buttonPagination(interaction.user.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);
                return;
            }
            else {
                if (userToDM !== null) {
                    interaction.followUp(`${userMention(interaction.user.id)}, you can't send DM's, only mod in the offical Raid: SL server can.`)
                    return;
                }

                const topCommandMessage = await interaction.user.send({ embeds: [guideEmbeds[0].topEmbed] });
                const midCommandMessage = await interaction.user.send({ embeds: [guideEmbeds[0].midEmbed] });
                const botCommandMessage = await interaction.user.send({ embeds: [guideEmbeds[0].botEmbed], components: [row1, row2] });
                const dmAlert = await interaction.followUp({ content: `${userMention(interaction.user.id)}${(showInServer) ? 'You can\'t show commands in this server.  ' : ''} I sent the guide I found to you, click the "Inbox" button below to check!`, components: [inbox] });
                await util.delayDeleteMessage(dmAlert as Message, 60 * 1000);
                await util.buttonPagination(interaction.user.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);
                return;
            }
        }
        else {
            if (userToDM !== null && canShowInServerOrDM) {
                const topCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].topEmbed] });
                const midCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].midEmbed] });
                const botCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].botEmbed], components: [row1] });
                interaction.user.id = userToDM.id;
                interaction.channel.id = await (await userToDM.createDM()).id;
                const guideSend = await interaction.followUp({ content: `I am sending the guide(s) to ${userMention(userToDM.id)}\'s DM\'s!` })
                await util.delayDeleteMessage(guideSend as Message, 60 * 1000);
                await util.buttonPagination(userToDM.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);
                return;
            }
            else if (canShowInServerOrDM && showInServer === true) {
                const topCommandMessage = await interaction.followUp({ embeds: [guideEmbeds[0].topEmbed] });
                const midCommandMessage = await interaction.followUp({ embeds: [guideEmbeds[0].midEmbed] });
                const botCommandMessage = await interaction.followUp({ embeds: [guideEmbeds[0].botEmbed], components: [row1] });
                await util.buttonPagination(interaction.user.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);

                return;
            }
            else {
                if (userToDM !== null) {
                    interaction.followUp(`${userMention(interaction.user.id)}, you can't send DM's, only mod in the offical Raid: SL server can.`)
                    return;
                }
                const topCommandMessage = await interaction.user.send({ embeds: [guideEmbeds[0].topEmbed] });
                const midCommandMessage = await interaction.user.send({ embeds: [guideEmbeds[0].midEmbed] });
                const botCommandMessage = await interaction.user.send({ embeds: [guideEmbeds[0].botEmbed], components: [row1] });
                const dmAlert = await interaction.followUp({ content: `${userMention(interaction.user.id)}${(showInServer) ? 'You can\'t show commands in this server.  ' : ''} I sent the guide I found to you, click the "Inbox" button below to check!`, components: [inbox] });
                await util.delayDeleteMessage(dmAlert as Message, 60 * 1000);
                await util.buttonPagination(interaction.user.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);
                return;
            }
        }
    }
    catch (err) {
        console.log(err)
    }
    finally {
        await mongoClient.close();
    }

}