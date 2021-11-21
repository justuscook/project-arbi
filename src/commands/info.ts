import { bold, Embed, SlashCommandBuilder, userMention } from '@discordjs/builders';
import discord, { ApplicationCommandPermissionData, CommandInteraction, Message, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { getColorByRarity, connectToCollection, fuzzySearch, getFactionImage, IChampionInfo, IGuide, canDM, canShow, inboxLinkButton, delayDeleteMessages, getSkillsEmbeds, skillsButtonPagination, removeShow } from '../general/util';
import { AddCommandToTotalFailedCommands, logger } from '../arbi';


export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('info')

    .addStringOption(option => option.setName('champion_name')
        .setDescription('Enter a champions name').setRequired(true))
    .addBooleanOption(option => option
        .setDescription('Wether to show the command in the channel or not.')
        .setName('show_in_server')
        .setRequired(false)
    )
    .setDescription('Search for champion information by name.')
    .setDefaultPermission(true);

export async function execute(interaction: CommandInteraction): Promise<boolean> {
    await interaction.deferReply();
    try {
        let showInServer = interaction.options.getBoolean('show_in_server');
        let row1: MessageActionRow = new MessageActionRow;
        //let allowDM = await canDM(interaction);
        let allowShow = await canShow(interaction);
        let champName = interaction.options.getString('champion_name')
        if (champName.toLowerCase().includes('show')) {
            showInServer = true,
                champName = removeShow(champName);
        }
        const collection = await connectToCollection('champion_info');
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
            let embed: MessageEmbed;
            embed = new MessageEmbed({
                title: (champ.name),
                color: getColorByRarity(champ.rarity),
                thumbnail: {
                    url: getFactionImage(champ.faction)
                },
                image: {
                    url: `https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/newAvatars/${parseInt(champ.id) - 6}.png`
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
            const skillsEmbeds: MessageEmbed[] = getSkillsEmbeds(champ, false);
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
                const statsMessage = await interaction.followUp({ embeds: [embed] });
                const skillsMessage = await interaction.followUp({ embeds: [skillsEmbeds[0]], components: [row1] });
                await skillsButtonPagination(interaction.user.id, skillsMessage as Message, skillsEmbeds);
                await delayDeleteMessages([statsMessage as Message, skillsMessage as Message])

            }
            else {
                const inbox = await inboxLinkButton(interaction.user);
                const dmWarnEmbed: MessageEmbed = new MessageEmbed(
                    {
                        description: `${userMention((await interaction.user.fetch()).id)}, ${(allowShow === false && showInServer === true) ? `you can't show commands in this server, only mod in the offical Raid: SL server can.  ` : ``}I have sent the output in a DM, click the button below to check your inbox!`,
                    }
                )
                if (interaction.channel.type !== 'DM') {
                    const dmWarn = await interaction.followUp({ embeds: [dmWarnEmbed], components: [inbox] });
                    await delayDeleteMessages([dmWarn as Message], 60 * 1000)
                    const _ = await interaction.user.send({ embeds: [embed] });
                    const skillsDM = await interaction.user.send({ embeds: [skillsEmbeds[0]], components: [row1] });
                    await skillsButtonPagination(interaction.user.id, skillsDM, skillsEmbeds);
                }
                else {
                    const _ = await interaction.followUp({ embeds: [embed] });
                    const skillsDM = await interaction.followUp({ embeds: [skillsEmbeds[0]], components: [row1] });
                    await skillsButtonPagination(interaction.user.id, skillsDM as Message, skillsEmbeds);
                }

            }
            return true;
        }
        else {
            const fail = await interaction.followUp(`${userMention((await interaction.user.fetch()).id)} I didn't find any matches for your search ${bold(champName)}, please try again.`)
            return false;
        }
    }
    catch (err) {
        logger.error(err);
    }
}

export const registerforTesting = false;



