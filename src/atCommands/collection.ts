import { Message, ActionRowBuilder, ButtonBuilder, MessageComponentInteraction, EmbedBuilder, ButtonStyle, Colors, MessageActionRowComponentBuilder, MessageComponentBuilder, ButtonComponent, ComponentType, ButtonInteraction, bold } from "discord.js";
import { totalmem } from "os";
import { mongoClient } from "../arbi";
import { Champion, IShardData, msToTime } from "../general/IShardData";
import { clipText, connectToCollection, fuzzySearch, getInput, ICommandInfo, IGuide, Timeout } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'collection',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        try {
            const collection = await connectToCollection('user_shard_data', mongoClient);
            let userData: IShardData = await collection.findOne<IShardData>({ userID: message.author.id });
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
                let row1: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder;
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

                const collectionMessage = await message.reply({
                    embeds: [legoEmbed],
                    allowedMentions: {
                        repliedUser: false
                    },
                    components: [row1]
                });
                const filter = i => i.user.id === message.author.id;
                const collector = collectionMessage.createMessageComponentCollector({ filter, time: Timeout.Mins15 });//time: util.Timeout.Mins15
                collector.on('collect', async (i: MessageComponentInteraction) => {
                    for (const b of row1.components) {
                        if (b.data !== i.customId) {
                            (b as ButtonBuilder).setStyle(ButtonStyle.Success)
                        }
                        else {
                            (b as ButtonBuilder).setStyle(ButtonStyle.Primary)
                        }

                    }
                    await i.deferUpdate();
                    switch (i.customId) {
                        case 'rare': {
                            await i.editReply({ embeds: [rareEmbed], components: [row1] })
                            break;
                        }
                        case 'epic': {
                            await i.editReply({ embeds: [epicEmbed], components: [row1] })
                            break;
                        }
                        case 'lego': {
                            await i.editReply({ embeds: [legoEmbed], components: [row1] })
                            break;
                        }
                    }
                })
                collector.on('end', async (x) => {
                    for (const b of row1.components) {
                        /*
                        const row = ActionRowBuilder.from(message.components[0]);
row.components[0].setDisabled();
message.edit({ components: [row] });*/
                        (b as ButtonBuilder).setDisabled(true)//need to test
                    }
                    await collectionMessage.edit({ components: collectionMessage.components })

                });
            }
            else {
                const noData: EmbedBuilder = new EmbedBuilder({
                    description: `You haven't used /summon yet?  Your clearly not a shard-a-holic.  Please try /claim to get some tokens, then /summon to pull some (simulated) shards!`
                })
                await message.reply(
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
            await message.reply({
                content: `╯︿╰ There seems to be an issue claiming your tokens, this is logged and we are looking into it.`, allowedMentions: {
                    repliedUser: false
                }
            })
            return false;
        }
    }
}


export default commandFile;

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
