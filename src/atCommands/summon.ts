import { bold, userMention } from "@discordjs/builders";
import { Message } from "discord.js";
import { connectToCollection, connectToDB, fuzzySearch, getInput, IChampionInfo, ICommandInfo, IGuide } from "../general/util";

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


        let champsPulledText = '';
        for (const c of champsPulled) {
            const id = parseInt(c.champ) + 6;
            const champ = champs.find(x => x.id === id);
            champsPulledText += `${champ.name}\n`;
        }
        message.reply({
            allowedMentions: {
                repliedUser: false
            }, content: `You pulled:\n${champsPulledText}`
        });
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

interface IChampPull {
    champ: string,
    rarity: string
}