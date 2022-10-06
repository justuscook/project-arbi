import { EmbedField, Message, AttachmentBuilder, EmbedBuilder, bold } from "discord.js";
import { champsByRarity, createTenPullImage } from "../general/imageUtils";
import { IChampPull, IShardData, Mercy, msToTime } from "../general/IShardData";
import { clipText, connectToCollection, fuzzySearch, getInput, IChampionInfo, ICommandInfo, IGuide } from "../general/util";
import { v1 as uuidv1 } from 'uuid';
import { client, mongoClient } from "../arbi";
import { getRandomIntInclusive } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'summon',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        //check events
        try {
            let collection = await connectToCollection('user_shard_data', mongoClient);
            let userData: IShardData = await collection.findOne<IShardData>({ userID: message.author.id })
            if (!userData) {
                const lastClaim = new Date(0);
                userData = {
                    champions: {
                        epic: [],
                        legendary: [],
                        rare: []
                    },
                    userID: message.author.id,
                    lastClaim: lastClaim,
                    mercy: {
                        ancient: {
                            epic: 0,
                            legendary: 0
                        },
                        void: {
                            epic: 0,
                            legendary: 0
                        },
                        sacred: {
                            epic: 0,
                            legendary: 0
                        },

                    },
                    tokens: 0,
                    shards: {
                        ancient: {
                            pulled: 0
                        },
                        void: {
                            pulled: 0
                        },
                        sacred: {
                            pulled: 0
                        }
                    }
                }
            }



            const shardType = input.split(' ')[0].toLowerCase();
            const validShardTypes = ['ancient', 'void', 'sacred']
            if (!validShardTypes.includes(shardType)) {
                await message.reply({
                    allowedMentions: {
                        repliedUser: false
                    }, content: `You didn't give a valid shard type to pull, type ${bold('ancient, sacred or void')} next time!`
                })
                return true;
            }
            let shardsToPull = parseInt(input.split(' ')[1]);
            if (shardsToPull === NaN) {
                await message.reply({
                    allowedMentions: {
                        repliedUser: false
                    }, content: `You didn't give a number of shards to pull, next time type the shard type then a number 1-1000`
                })
                return true;
                //error
            }
            const now: Date = new Date(Date.now());
            const midnight = new Date;
            midnight.setUTCHours(24, 0, 0, 0);
            const waitTime = midnight.getTime() - now.getTime();

            if (shardsToPull > 100) shardsToPull = 100;
            if (userData.tokens < shardsToPull) {
                const notEnough = new EmbedBuilder(
                    {
                        description: `You don't have enough tokens to pull that many shards! You can claim again in ${msToTime(waitTime)}`,
                        fields: [
                            {
                                name: 'Current tokens:',
                                value: userData.tokens.toString()
                            },
                            {
                                name: 'Tokens needed:',
                                value: (shardsToPull - userData.tokens).toString()
                            }
                        ],
                        footer: {
                            text: `Hint: user /claim or \`@${client.user.username} claim\` to claim your tokens.`
                        }
                    }
                )
                await message.reply({
                    allowedMentions: {
                        repliedUser: false
                    }, embeds: [notEnough]
                })
                return true;
            }
            collection = await connectToCollection('shard_data', mongoClient);
            const champPool = await collection.findOne<IChampionPool>({});
            collection = await connectToCollection('champion_info', mongoClient);
            const champs = await collection.find<IChampionInfo>({}).toArray();
            switch (shardType) {
                case 'ancient':
                    userData.shards.ancient.pulled += shardsToPull;
                    break;
                case 'void':
                    userData.shards.void.pulled += shardsToPull;
                    break;
                case 'sacred':
                    userData.shards.sacred.pulled += shardsToPull;
                    break;
            }
            let champsPulled: IChampPull[] = [];

            //const epicRate = getRate('epic', shardType);
            for (let i = 0; i < shardsToPull; i++) {
                const legoRate = getRate('legendary', shardType, userData.mercy);
                const rareRate = getRate('rare', shardType, userData.mercy);
                const random = getRandomIntInclusive(0, 100)
                if (random > 100 - legoRate) {
                    champsPulled.push({ champ: await getRandomChampion(champPool, shardType, 'legendary', userData.mercy), rarity: 'legendary' });
                }
                else if (shardType !== 'sacred' && random > 100 - rareRate) {
                    champsPulled.push({ champ: await getRandomChampion(champPool, shardType, 'rare', userData.mercy), rarity: 'rare' });
                }
                else {
                    champsPulled.push({ champ: await getRandomChampion(champPool, shardType, 'epic', userData.mercy), rarity: 'epic' });
                }
            }
            const rarityList = champsByRarity(champsPulled);

            let champsPulledText = '';

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
                    raresField.value += `${champ.name}, `;
                    if (userData.champions.rare.length !== 0 && userData.champions.rare.find(x => x.name === champ.name)) {
                        userData.champions.rare.find(x => x.name === champ.name).number++
                    }
                    else {
                        userData.champions.rare.push({
                            affinity: champ.affinity,
                            name: champ.name,
                            number: 1
                        })
                    }
                }
            }
            if (rarityList.epics.length > 0) {

                for (const r of rarityList.epics) {
                    const id = parseInt(r.champ) + 6;
                    const champ = champs.find(x => x.id === id);
                    epicsField.value += `${champ.name}, `;
                    if (userData.champions.epic.length !== 0 && userData.champions.epic.find(x => x.name === champ.name)) {
                        userData.champions.epic.find(x => x.name === champ.name).number++
                    }
                    else {
                        userData.champions.epic.push({
                            affinity: champ.affinity,
                            name: champ.name,
                            number: 1
                        })
                    }
                }
            }
            if (rarityList.legendaries.length > 0) {
                for (const r of rarityList.legendaries) {
                    const id = parseInt(r.champ) + 6;
                    const champ = champs.find(x => x.id === id);
                    legosField.value += `${champ.name}, `;
                    if (userData.champions.legendary.length !== 0 && userData.champions.legendary.find(x => x.name === champ.name)) {
                        userData.champions.legendary.find(x => x.name === champ.name).number++
                    }
                    else {
                        userData.champions.legendary.push({
                            affinity: champ.affinity,
                            name: champ.name,
                            number: 1
                        })
                    }
                }
            }
            userData.tokens = userData.tokens - shardsToPull;
            const collection2 = await connectToCollection('user_shard_data', mongoClient);
            await collection2.updateOne(
                { userID: message.author.id },
                { $set: userData },
                { upsert: true },
                async (err: any, result: any) => {

                    if (err) {
                        console.log(err)
                        await message.channel.send(`╯︿╰ There seems to be an issue summoning your shards, this is logged and we are looking into it.`)
                        return false;
                    }

                });

            raresField.value = clipText(raresField.value.slice(0, raresField.value.length - 2))
            epicsField.value = clipText(epicsField.value.slice(0, epicsField.value.length - 2))
            legosField.value = clipText(legosField.value.slice(0, legosField.value.length - 2))
            let embed: EmbedBuilder;
            let legoAnimation: Message;
            if (champsPulled.find(x => x.rarity === 'legendary')) {
                legoAnimation = await message.channel.send('https://media.discordapp.net/attachments/558596438452600855/644460171937972227/legpull.gif')
            }
            if (champsPulled.length > 9) {
                try {
                    const tenPullImage = await createTenPullImage(champsPulled);
                    const id = uuidv1();
                    const imageFile: AttachmentBuilder = new AttachmentBuilder(Buffer.from(tenPullImage), { name: `${id}.png` });

                    embed = new EmbedBuilder(
                        {
                            image: {
                                url: `attachment://${id}.png`
                            },
                            description: `Here is what you pulled from ${shardsToPull} ${shardType} shard(s):`
                        }
                    )
                    if (rarityList.legendaries.length > 0) {
                        embed.data.fields.push(legosField)
                    }
                    if (rarityList.epics.length > 0) {
                        embed.data.fields.push(epicsField)
                    }
                    if (rarityList.rares.length > 0) {
                        embed.data.fields.push(raresField)
                    }
                    setTimeout(async () => {
                        if (legoAnimation) {
                            await legoAnimation.delete();
                        }
                        await message.reply({
                            files: [imageFile],
                            allowedMentions: {
                                repliedUser: false
                            }, embeds: [embed]
                        });
                    }, 1000)
                    return true;
                }
                catch (err) {
                    if (legoAnimation) {
                        await legoAnimation.delete();
                    }
                    await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, embeds: [embed]
                    });
                }
            }
            else {
                embed = new EmbedBuilder(
                    {
                        description: `Here is what you pulled from ${shardsToPull} ${shardType} shard(s):`
                    }
                )
                if (rarityList.legendaries.length > 0) {
                    embed.data.fields.push(legosField)
                }
                if (rarityList.epics.length > 0) {
                    embed.data.fields.push(epicsField)
                }
                if (rarityList.rares.length > 0) {
                    embed.data.fields.push(raresField)
                }
                setTimeout(async () => {
                    if (legoAnimation) {
                        await legoAnimation.delete();
                    }
                    await message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, embeds: [embed]
                    });
                }, 1000);
                return true;
            }
        }
        catch (err) {

        }
    }

}
export default commandFile;


function getRate(heroType: string, shardType: string, mercy: Mercy): number {
    //check for events
    switch (heroType) {
        case 'rare': {
            switch (shardType) {
                case 'ancient': {
                    return 91.5 - ((mercy.ancient.epic > 20) ? (mercy.ancient.epic * .02) : 0) - ((mercy.ancient.legendary > 200) ? (mercy.ancient.legendary * .05) : 0);
                }
                case 'sacred': {
                    return 0;
                }
                case 'void': {
                    return 91.5 - ((mercy.void.epic > 20) ? (mercy.void.epic * .02) : 0) - ((mercy.void.legendary > 200) ? (mercy.void.legendary * .05) : 0);
                }
            }
            break;
        }/*
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
        }*/
        case 'legendary': {
            switch (shardType) {
                case 'ancient': {
                    return .5 + ((mercy.ancient.legendary > 200) ? (mercy.ancient.legendary * .05) : 0);
                }
                case 'sacred': {
                    return 6 + ((mercy.sacred.legendary > 200) ? (mercy.sacred.legendary * .02) : 0);
                }
                case 'void': {
                    return .5 + ((mercy.void.legendary > 200) ? (mercy.void.legendary * .05) : 0);
                }
            }
            break;
        }
    }
}

async function getRandomChampion(champPool: IChampionPool, shardType: string, rarity: string, mercy: Mercy): Promise<string> {

    switch (shardType) {
        case 'ancient': {
            switch (rarity) {
                case 'rare': {
                    mercy.ancient.epic += 1;
                    mercy.ancient.legendary += 1;
                    return champPool.ancient.rare[Math.floor(Math.random() * champPool.ancient.rare.length)];
                }
                case 'epic': {
                    mercy.ancient.epic = 0;
                    mercy.ancient.epic += 1;
                    return champPool.ancient.epic[Math.floor(Math.random() * champPool.ancient.epic.length)];
                }
                case 'legendary': {
                    mercy.ancient.legendary = 0;
                    mercy.ancient.epic += 1;
                    return champPool.ancient.legendary[Math.floor(Math.random() * champPool.ancient.legendary.length)];

                }
            }
        }
        case 'sacred': {
            switch (rarity) {
                case 'epic': {
                    mercy.sacred.epic = 0;
                    mercy.sacred.legendary += 1;
                    return champPool.sacred.epic[Math.floor(Math.random() * champPool.sacred.epic.length)];
                }
                case 'legendary': {
                    mercy.sacred.epic += 1;
                    mercy.sacred.legendary = 0;
                    return champPool.sacred.legendary[Math.floor(Math.random() * champPool.sacred.legendary.length)];

                }
            }

        }
        case 'void': {
            switch (rarity) {
                case 'rare': {
                    mercy.void.epic + 1;
                    mercy.void.legendary += 1;
                    return champPool.void.rare[Math.floor(Math.random() * champPool.void.rare.length)];
                }
                case 'epic': {
                    mercy.void.epic = 0;
                    mercy.void.legendary += 1;
                    return champPool.void.epic[Math.floor(Math.random() * champPool.void.epic.length)];
                }
                case 'legendary': {
                    mercy.void.epic += 1;
                    mercy.void.legendary = 0;
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

