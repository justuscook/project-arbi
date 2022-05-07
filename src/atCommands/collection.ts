import { bold, userMention } from "@discordjs/builders";
import { Message, MessageActionRow, MessageButton, MessageComponentInteraction, MessageEmbed } from "discord.js";
import { totalmem } from "os";
import { Champion, IShardData, msToTime } from "../general/IShardData";
import { clipText, connectToCollection, connectToDB, fuzzySearch, getInput, ICommandInfo, IGuide, Timeout } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'collection',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        try {
            const mongoClient = await connectToDB();
            const collection = await connectToCollection('user_shard_data', mongoClient);
            let userData: IShardData = await collection.findOne<IShardData>({ userID: message.author.id });
            await mongoClient.close()
            const embeds: MessageEmbed[] = [];
            let rareEmbed: MessageEmbed;
            let epicEmbed: MessageEmbed;
            let legoEmbed: MessageEmbed;
            const now: Date = new Date(Date.now());
            const midnight = new Date;
            midnight.setUTCHours(24, 0, 0, 0);
            const waitTime = midnight.getTime() - now.getTime();
            if (userData) {
                rareEmbed = new MessageEmbed({
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

                epicEmbed = new MessageEmbed({
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
                    color: 'PURPLE',
                    description: `Info about your collection and epics:`
                })

                legoEmbed = new MessageEmbed({
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
                    color: 'GOLD',
                    description: `Info about your collection and legendaries:`
                })
                let row1: MessageActionRow = new MessageActionRow;
                row1.addComponents(
                    new MessageButton()
                        .setCustomId('lego')
                        .setLabel('Legendaries')
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId('epic')
                        .setLabel('Epics')
                        .setStyle('SUCCESS'),
                    new MessageButton()
                        .setCustomId('rare')
                        .setLabel('Rares')
                        .setStyle('SUCCESS')
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
                        if (b.customId !== i.customId) {
                            (b as MessageButton).setStyle('SUCCESS')
                        }
                        else {
                            (b as MessageButton).setStyle('PRIMARY')
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
                    for (const r of collectionMessage.components) {
                        for (const c of r.components) {
                            c.setDisabled(true);
                        }
                    }
                    await collectionMessage.edit({ components: collectionMessage.components })

                });
            }
            else {
                const noData: MessageEmbed = new MessageEmbed({
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
