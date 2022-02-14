import { bold, userMention } from "@discordjs/builders";
import { Message } from "discord.js";
import { connectToCollection, connectToDB, fuzzySearch, getInput, ICommandInfo, IGuide } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'summon',
    execute: async (message: Message): Promise<boolean> => {
        //check events
        const input = message.content.split(' ');
        const shardType = input[0];
        const shardsToPull = input[1];

        const legoRate = getRate('legendary', shardType)
        const rareRate = getRate('rare',)
        const random = getRandomIntInclusive(0, 100)
        if (random > 100 - legoRate) {
            lego
        }
        else if (random < 100 - rareRate) {
            shardType
            rare
        }
        else {
            epic//.5 8 91.5
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

async function getRandomChampion(shardType: string, heroType: string) {
    const mongoClient = await connectToDB();
    const collection = await connectToCollection('shard_data', mongoClient);
    const champPool = await collection.find<IChampionPool>({})
    console.log(champPool)
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