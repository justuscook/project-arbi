import { CommandInteraction, Message, ActionRowBuilder, ButtonBuilder, MessageComponentInteraction, EmbedBuilder, SlashCommandBuilder, Colors, ButtonStyle, MessageActionRowComponentBuilder, ButtonComponent, ComponentType, bold } from 'discord.js';
import { mongoClient } from '../arbi';
import { Champion, IShardData, msToTime } from '../general/IShardData';
import { clipText, connectToCollection, Timeout } from '../general/util';

export const registerforTesting = false;
export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('collection')
    .setDefaultPermission(true)
    .setDescription('Show off your champion collection from your bot summons!');
export async function execute(interaction: CommandInteraction): Promise<boolean> {
    await interaction.deferReply();
    try {

        const collection = await connectToCollection('user_shard_data', mongoClient);
        let userData: IShardData = await collection.findOne<IShardData>({ userID: interaction.user.id });

        const embeds: EmbedBuilder[] = [];
        let rareEmbed: EmbedBuilder;
        let epicEmbed: EmbedBuilder;
        let legoEmbed: EmbedBuilder;
        const now: Date = new Date(Date.now());
        const midnight = new Date;
        midnight.setUTCHours(24, 0, 0, 0);
        const waitTime = midnight.getTime() - now.getTime();
        if (userData) {
            rareEmbed = new EmbedBuilder({
                fields: [
                    {
                        name: 'Tokens:',
                        value: userData.tokens.toString()
                    },
                    {
                        name: 'Time till next claim:',
                        value: (waitTime > 0) ? msToTime(waitTime) : 'You can /claim right now!'
                    },
                    {
                        name: `Rares: ${(userData.champions.rare.length > 0) ? getTotalChampsByRarity(userData.champions.rare) : ''}`,
                        value: (userData.champions.rare.length > 0) ? getCollectionText(userData.champions.rare) : `You don't have any rares?  You only summons sacred don't you...`
                    }
                ],
                color: 0x00FFFF,
                description: `Info about your collection and rares:`
            })

            epicEmbed = new EmbedBuilder({
                fields: [
                    {
                        name: 'Tokens:',
                        value: userData.tokens.toString()
                    },
                    {
                        name: 'Time till next claim:',
                        value: (waitTime > 0) ? msToTime(waitTime) : 'You can /claim right now!'
                    },
                    {
                        name: `Epics: ${(userData.champions.epic.length > 0) ? getTotalChampsByRarity(userData.champions.epic) : ''}`,
                        value: (userData.champions.rare.length > 0) ? getCollectionText(userData.champions.epic) : `You don't have any epics?  Have you tried a sacred shard lol...`
                    }
                ],
                color: Colors.Purple,
                description: `Info about your collection and epics:`
            })

            legoEmbed = new EmbedBuilder({
                fields: [
                    {
                        name: 'Tokens:',
                        value: userData.tokens.toString()
                    },
                    {
                        name: 'Time till next claim:',
                        value: (waitTime > 0) ? msToTime(waitTime) : 'You can /claim right now!'
                    },
                    {
                        name: `Legendaries:  ${(userData.champions.legendary.length > 0) ? getTotalChampsByRarity(userData.champions.legendary) : ''}`,
                        value: (userData.champions.rare.length > 0) ? getCollectionText(userData.champions.legendary) : `You don't have any legos?  Try /summon sacred 100...`
                    }
                ],
                color: Colors.Gold,
                description: `Info about your collection and legendaries:`
            })
            let row1: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder;
            row1.addComponents(
                new ButtonBuilder()
                    .setCustomId('lego')
                    .setLabel('Legendaries')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('epic')
                    .setLabel('Epics')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('rare')
                    .setLabel('Rares')
                    .setStyle(ButtonStyle.Success)
            )

            const collectionMessage = await interaction.followUp({
                embeds: [legoEmbed],
                allowedMentions: {
                    repliedUser: false
                },
                components: [row1]
            }) as Message;
            const filter = i => i.user.id === interaction.user.id;
            const collector = collectionMessage.createMessageComponentCollector({ filter, time: Timeout.Mins15 });//time: util.Timeout.Mins15
            collector.on('collect', async (i: MessageComponentInteraction) => {
                const buttons = collectionMessage.components[0].components as ButtonComponent[];
                let newRow1: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder;
                for (let b of buttons) {
                    if (b.customId !== i.customId) {
                        newRow1.addComponents((ButtonBuilder.from(b as ButtonComponent).setStyle(ButtonStyle.Success)))
                    }
                    else {
                        newRow1.addComponents((ButtonBuilder.from(b as ButtonComponent).setStyle(ButtonStyle.Primary)))
                    }

                }
                await i.deferUpdate();
                switch (i.customId) {
                    case 'rare': {
                        await i.editReply({ embeds: [rareEmbed], components: [newRow1] })
                        break;
                    }
                    case 'epic': {
                        await i.editReply({ embeds: [epicEmbed], components: [newRow1] })
                        break;
                    }
                    case 'lego': {
                        await i.editReply({ embeds: [legoEmbed], components: [newRow1] })
                        break;
                    }
                }
            });
            collector.on('end', async (x) => {
                for (const r of collectionMessage.components) {
                    for (const c of r.components) {
                        ButtonBuilder.from(c as ButtonComponent).setDisabled(true);
                    }
                }
                await collectionMessage.edit({ components: collectionMessage.components })

            });
        }
        else {
            const noData: EmbedBuilder = new EmbedBuilder({
                description: `You haven't used /summon yet?  Your clearly not a shard-a-holic.  Please try /claim to get some tokens, then /summon to pull some (simulated) shards!`
            })
            await interaction.followUp(
                {
                    embeds: [noData],
                    allowedMentions: {
                        repliedUser: false
                    }
                }
            )
        }

        return true;
    }
    catch (err) {
        console.log(err);
        await interaction.followUp({
            content: `╯︿╰ There seems to be an issue claiming your tokens, this is logged and we are looking into it.`, allowedMentions: {
                repliedUser: false
            }
        })
        return false;
    }
}

function getCollectionText(data: Champion[]): string {
    let text = '';
    for (const c of data) {
        text += `${bold(c.name)}${(c.number > 1) ? ` x ${c.number}` : ''}, `
    }
    return clipText(text);
}

function getTotalChampsByRarity(champs: Champion[]): number {
    let total = 0;
    try {
        for (const c of champs) {
            total += c.number;
        }
    }
    finally {
        return total;
    }
}

export const usage = '/collection'
