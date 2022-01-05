import { SlashCommandBuilder, bold, userMention, Embed, codeBlock } from '@discordjs/builders';
import { CommandInteraction, Message, MessageActionRow, MessageButton, MessageEmbed, MessageEmbedImage, User } from 'discord.js';
import { IMessageEmbeds } from '../general/util'
import * as util from '../general/util';
import { AddToFailedGuideSearches, AddToSuccessfulGuideSearches } from '../arbi';

export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('guide')
    .addStringOption(option => option
        .setName('input')
        .setDescription('Enter a champions name or game location.  Can also be \'show\' and @mentions.')
        .setRequired(true))
    .addBooleanOption(option => option
        .setDescription('Whether to show the command in the channel or not.')
        .setName('show_in_server')
        .setRequired(false)
    )
    .addUserOption(option => option
        .setName('user_to_dm')
        .setRequired(false)
        .setDescription('Only for Raid: SL offical server mods, DM\'s guides to users')
    )
    .setDescription('Search for guides by champion or dungeon name.')

export async function execute(interaction: CommandInteraction): Promise<boolean> {
    await interaction.deferReply();
    const commandText = await interaction.toString();
    const commandTextEmbed = new MessageEmbed()
        .setAuthor(commandText)
        .setDescription('Processing your command now!');
    const commandTextMessage = await interaction.followUp({ embeds: [commandTextEmbed] });
    let row1: MessageActionRow = new MessageActionRow;
    let row2: MessageActionRow = new MessageActionRow;
    const embeds: IMessageEmbeds[] = [];
    let userToDM: User = interaction.options.getUser('user_to_dm');
    const originalUser: User = interaction.user;
    let canDM = await util.canDM(interaction);
    let canShow = await util.canShow(interaction);
    let input: string = interaction.options.getString('input');
    let ogInput = input;
    let showInServer = interaction.options.getBoolean('show_in_server');
    if (input === null) input = 'list';
    if (input.toLowerCase().includes('show')) {
        input = util.removeShow(input).trimEnd().trimStart();
        showInServer = true;
    }//const regexCheck = /<@(!|)userID>/gim;
    //if (regexCheck.exec(x) !== null) {}
    if (input.includes('<@')) {
        let userID = input.replace(/\D/g, '');
        userToDM = await interaction.client.users.fetch(userID);
        input = input.replace('!', '');
        input = input.replace(`<@${userID}>`, '').trimEnd();
    }
    console.log(input);
    try {
        const inbox = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setLabel('Inbox')
                    .setStyle('LINK')
                    .setURL(`https://discord.com/channels/@me/${await (await interaction.user.createDM()).id}`)
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
                const listMessage = await interaction.followUp({ embeds: [genGuidesEmbed, champEmbed1, champEmbed2] });
                await util.delayDeleteMessages([listMessage as Message]);
                return true;
            }
            else {
                const dmEmbed = new MessageEmbed()
                    .setDescription(`${interaction.user.toString()}${(showInServer) ? `You can\'t show commands in this server.` : ''} Guide(s) sent, check your "Inbox"!`)
                    .setAuthor(`/${interaction.command.name} input: ${ogInput}${(showInServer) ? ` show_in_server: ${showInServer.toString()}` : ''}${(userToDM) ? ` show_in_server: ${userToDM.toString()}` : ''}`)

                const dmAlert = await interaction.followUp({ embeds: [dmEmbed], components: [inbox] });
                const listMessage = await interaction.user.send({ embeds: [genGuidesEmbed, champEmbed1, champEmbed2] });
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
            await interaction.followUp(`There are no guides for ${bold(input)} yet!`);
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
                authors = await util.GetAuthor(interaction.client, f.author);
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
            embeds[0].setAuthor(authorsNames, (authors.length > 1) ? 'https://cdn.discordapp.com/attachments/737622176995344485/892856095624810536/Share-damage-2.png' : authors[0].avatarURL()
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
            if (userToDM !== null && canDM) {
                const topCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].topEmbed] });
                const midCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].midEmbed] });
                const botCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].botEmbed], components: [row1, row2] });
                //interaction.user.id = userToDM.id;
                //interaction.channel.id = await (await userToDM.createDM()).id;
                const guideSend = await interaction.followUp({ content: `I am sending the guide(s) to ${userToDM.toString()}\'s DM\'s!` });

                await util.guideButtonPagination(userToDM.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);
                await util.delayDeleteMessages([guideSend as Message], 60 * 1000);
                return true;
            }
            else if (canShow && showInServer === true) {
                const topCommandMessage = await interaction.followUp({ embeds: [guideEmbeds[0].topEmbed] });
                const midCommandMessage = await interaction.followUp({ embeds: [guideEmbeds[0].midEmbed] });
                const botCommandMessage = await interaction.followUp({ embeds: [guideEmbeds[0].botEmbed], components: [row1, row2] });
                await util.guideButtonPagination(interaction.user.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);
                return true;
            }
            else {
                if (userToDM !== null) {
                    await interaction.followUp(`${interaction.user.toString()}, you can't send DM's, only mod in the offical Raid: SL server can.`)
                    return true;
                }
                const topCommandMessage = await interaction.user.send({ embeds: [guideEmbeds[0].topEmbed] });
                const midCommandMessage = await interaction.user.send({ embeds: [guideEmbeds[0].midEmbed] });
                const botCommandMessage = await interaction.user.send({ embeds: [guideEmbeds[0].botEmbed], components: [row1, row2] });
                const dmEmbed = new MessageEmbed()
                    .setDescription(`${interaction.user.toString()}${(showInServer) ? 'You can\'t show commands in this server.  ' : ''} I sent the guide I found to you, click the "Inbox" button below to check!`)


                const dmAlert = await interaction.followUp({ embeds: [dmEmbed], components: [inbox] });

                await util.guideButtonPagination(interaction.user.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);
                await util.delayDeleteMessages([dmAlert as Message], 60 * 1000, showInServer);
                return true;

            }
        }
        else {
            if (userToDM !== null && canDM) {
                const topCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].topEmbed] });
                const midCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].midEmbed] });
                const botCommandMessage = await userToDM.send({ embeds: [guideEmbeds[0].botEmbed], components: [row1] });
                //interaction.user.id = userToDM.id;
                //interaction.channel.id = await (await userToDM.createDM()).id;
                const guideSend = await interaction.followUp({ content: `I am sending the guide(s) to ${userToDM.toString()}\'s DM\'s!` })

                await util.guideButtonPagination(userToDM.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);
                await util.delayDeleteMessages([guideSend as Message], 60 * 1000);
                return true;
            }
            else if (canShow && showInServer === true) {
                const topCommandMessage = await interaction.followUp({ embeds: [guideEmbeds[0].topEmbed] });
                const midCommandMessage = await interaction.followUp({ embeds: [guideEmbeds[0].midEmbed] });
                const botCommandMessage = await interaction.followUp({ embeds: [guideEmbeds[0].botEmbed], components: [row1] });
                await util.guideButtonPagination(interaction.user.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);

                return true;
            }
            else {
                if (userToDM !== null) {
                    await interaction.followUp(`${interaction.user.toString()}, you can't send DM's, only mod in the offical Raid: SL server can.`)
                    return true;
                }
                const topCommandMessage = await interaction.user.send({ embeds: [guideEmbeds[0].topEmbed] });
                const midCommandMessage = await interaction.user.send({ embeds: [guideEmbeds[0].midEmbed] });
                const botCommandMessage = await interaction.user.send({ embeds: [guideEmbeds[0].botEmbed], components: [row1] });
                const dmEmbed = new MessageEmbed()
                    .setDescription(`${interaction.user.toString()}${(showInServer) ? 'You can\'t show commands in this server.  ' : ''}  Guide(s) sent, check your "Inbox"!`)
                    .setAuthor(`/${interaction.command.name} input: ${ogInput}${(showInServer) ? ` show_in_server: ${showInServer.toString()}` : ''}${(userToDM) ? ` show_in_server: ${userToDM.toString()}` : ''}`)

                const dmAlert = await interaction.followUp({ embeds: [dmEmbed], components: [inbox] });


                await util.guideButtonPagination(interaction.user.id, [topCommandMessage as Message, midCommandMessage as Message, botCommandMessage as Message], guideEmbeds);
                await util.delayDeleteMessages([dmAlert as Message], 60 * 1000, showInServer);
                return true;


            }
        }
    }
    catch (err) {
        interaction.followUp('There was an error in your guide search, it It logged and we are looking into it!  Please use /support and ask for help with your issue if it keeps happening.');
        console.log(err)
        return false;

    }
}

export const registerforTesting = true;