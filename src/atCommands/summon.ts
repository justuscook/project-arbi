import { bold, userMention } from "@discordjs/builders";
import { EmbedField, EmbedFieldData, Message, MessageAttachment, MessageEmbed } from "discord.js";
import { champsByRarity, createTenPullImage } from "../general/imageUtils";
import { IChampPull } from "../general/IShardData";
import { clipText, connectToCollection, connectToDB, fuzzySearch, getInput, IChampionInfo, ICommandInfo, IGuide } from "../general/util";
import { v1 as uuidv1 } from 'uuid';

const commandFile: ICommandInfo = {
    name: 'summon',
    execute: async (message: Message): Promise<boolean> => {
        //check events
        const input = message.content.split(' ');
        const shardType = input[2].toLowerCase();
        const validShardTypes = ['ancient', 'void', 'sacred']
        if (!validShardTypes.includes(shardType)) {
            await message.reply({
                allowedMentions: {
                    repliedUser: false
                }, content: `You didn't give a valid shard type to pull, type ${bold('ancient, sacred or void')} next time!`
            })
            return true;
        }
        let shardsToPull = parseInt(input[3]);
        if (shardsToPull === NaN) {
            await message.reply({
                allowedMentions: {
                    repliedUser: false
                }, content: `You didn't give a number of shards to pull, next time type the shard type then a number 1-1000`
            })
            return true;
            //error
        }
        if (shardsToPull > 100) shardsToPull = 100;
        const mongoClient = await connectToDB();
        let collection = await connectToCollection('shard_data', mongoClient);
        const champPool = await collection.findOne<IChampionPool>({});
        collection = await connectToCollection('champion_info', mongoClient);
        const champs = await collection.find<IChampionInfo>({}).toArray();
        mongoClient.close();
        let champsPulled: IChampPull[] = [];
        const legoRate = getRate('legendary', shardType);
        const rareRate = getRate('rare', shardType);
        //const epicRate = getRate('rare', shardType);
        for (let i = 0; i < shardsToPull; i++) {
            const random = getRandomIntInclusive(0, 100)
            if (random > 100 - legoRate) {
                champsPulled.push({ champ: await getRandomChampion(champPool, shardType, 'legendary'), rarity: 'legendary' });
            }
            else if (shardType !== 'sacred' && random < 100 - rareRate) {
                champsPulled.push({ champ: await getRandomChampion(champPool, shardType, 'rare'), rarity: 'rare' });
            }
            else {
                champsPulled.push({ champ: await getRandomChampion(champPool, shardType, 'epic'), rarity: 'epic' });
            }
        }
        const rarityList = champsByRarity(champsPulled);
        /*
        const sortedChampsPulled: IChampPull[] = [];
        sortedChampsPulled.push(...rarityList.legendaries)
        sortedChampsPulled.push(...rarityList.epics)
        sortedChampsPulled.push(...rarityList.rares)
        champsPulled = sortedChampsPulled;*/

        let champsPulledText = '';
        /*
        for (const c of champsPulled) {
            const id = parseInt(c.champ) + 6;
            const champ = champs.find(x => x.id === id);
            champsPulledText += `${champ.name}, `;
        }
        champsPulledText = champsPulledText.trim()
        champsPulledText = champsPulledText.slice(0, champsPulledText.length - 1)
        */


        let legosField: EmbedField = {
            name: 'Legendaries:',
            inline: false,
            value: ''
        }
        let epicsField: EmbedField = {
            name: 'Epics:',
            inline: false,
            value: ''
        }
        let raresField: EmbedField = {
            name: 'Rares:',
            inline: false,
            value: ''
        }
        if (rarityList.rares.length > 0) {
            for (const r of rarityList.rares) {
                const id = parseInt(r.champ) + 6;
                const champ = champs.find(x => x.id === id);
                raresField.value += `${champ.name}, `
            }
        }
        if (rarityList.epics.length > 0) {

            for (const r of rarityList.epics) {
                const id = parseInt(r.champ) + 6;
                const champ = champs.find(x => x.id === id);
                epicsField.value += `${champ.name}, `
            }
        }
        if (rarityList.legendaries.length > 0) {
            for (const r of rarityList.legendaries) {
                const id = parseInt(r.champ) + 6;
                const champ = champs.find(x => x.id === id);
                legosField.value += `${champ.name}, `
            }
        }
        raresField.value = clipText(raresField.value.slice(0, raresField.value.length - 2))
        epicsField.value = clipText(epicsField.value.slice(0, epicsField.value.length - 2))
        legosField.value = clipText(legosField.value.slice(0, legosField.value.length - 2))
        let embed: MessageEmbed;
        let legoAnimation: Message;
        if (champsPulled.find(x => x.rarity === 'legendary')) {
            legoAnimation = await message.channel.send('https://media.discordapp.net/attachments/558596438452600855/644460171937972227/legpull.gif')
        }
        if (champsPulled.length > 9) {
            const tenPullImage = await createTenPullImage(champsPulled);
            const id = uuidv1();
            const imageFile: MessageAttachment = new MessageAttachment(Buffer.from(tenPullImage), `${id}.png`);

            embed = new MessageEmbed(
                {
                    image: {
                        url: `attachment://${id}.png`
                    }

                }
            )
            if (rarityList.legendaries.length > 0) {
                embed.fields.push(legosField)
            }
            if (rarityList.epics.length > 0) {
                embed.fields.push(epicsField)
            }
            if (rarityList.rares.length > 0) {
                embed.fields.push(raresField)
            }

            await legoAnimation.delete();
            await message.reply({
                files: [imageFile],
                allowedMentions: {
                    repliedUser: false
                }, embeds: [embed]
            });
        }
        else {
            await legoAnimation.delete();
            await message.reply({
                allowedMentions: {
                    repliedUser: false
                }, embeds: [embed]
            });
        }
    }


}
export default commandFile;

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

function getRate(heroType: string, shardType: string): number {
    //check for events
    switch (heroType) {
        case 'rare': {
            switch (shardType) {
                case 'ancient': {
                    return 91.5;
                }
                case 'sacred': {
                    return 0;
                }
                case 'void': {
                    return 91.5;
                }
            }
            break;
        }
        case 'epic': {
            switch (shardType) {
                case 'ancient': {
                    return 8;
                }
                case 'sacred': {
                    return 94;
                }
                case 'void': {
                    return 8;
                }
            }
            break;
        }
        case 'legendary': {
            switch (shardType) {
                case 'ancient': {
                    return .5;
                }
                case 'sacred': {
                    return 6;
                }
                case 'void': {
                    return .5;
                }
            }
            break;
        }
    }
}

async function getRandomChampion(champPool: IChampionPool, shardType: string, rarity: string): Promise<string> {

    switch (shardType) {
        case 'ancient': {
            switch (rarity) {
                case 'rare': {
                    return champPool.ancient.rare[Math.floor(Math.random() * champPool.ancient.rare.length)];
                }
                case 'epic': {
                    return champPool.ancient.epic[Math.floor(Math.random() * champPool.ancient.epic.length)];
                }
                case 'legendary': {
                    return champPool.ancient.legendary[Math.floor(Math.random() * champPool.ancient.legendary.length)];

                }
            }
        }
        case 'sacred': {
            switch (rarity) {
                case 'epic': {
                    return champPool.sacred.epic[Math.floor(Math.random() * champPool.sacred.epic.length)];
                }
                case 'legendary': {
                    return champPool.sacred.legendary[Math.floor(Math.random() * champPool.sacred.legendary.length)];

                }
            }

        }
        case 'void': {
            switch (rarity) {
                case 'rare': {
                    return champPool.void.rare[Math.floor(Math.random() * champPool.void.rare.length)];
                }
                case 'epic': {
                    return champPool.void.epic[Math.floor(Math.random() * champPool.void.epic.length)];
                }
                case 'legendary': {
                    return champPool.void.legendary[Math.floor(Math.random() * champPool.void.legendary.length)];
                }
            }
        }
    }

}

interface IChampionPool {
    ancient: {
        rare: [],
        epic: []
        legendary: []
    },
    sacred: {
        rare: [],
        epic: []
        legendary: []
    },
    void: {
        rare: [],
        epic: []
        legendary: []
    }
}

