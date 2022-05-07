import { IChampPull } from "./IShardData";
import sharp from 'sharp';
import Axios from 'axios'
import path from "path";
import { isFunction } from "util";
import { logger } from "../arbi";


export function champsByRarity(champions: IChampPull[]){
    const legendaries = champions.filter(x => {
        if (x.rarity === 'legendary') {
            return x;
        }
    })
    const epics = champions.filter(x => {
        if (x.rarity === 'epic') {
            return x;
        }
    })
    const rares = champions.filter(x => {
        if (x.rarity === 'rare') {
            return x;
        }
    })

    return {legendaries, epics, rares}

}


export async function createTenPullImage(champions: IChampPull[]): Promise<Buffer> {
    const rarityList = champsByRarity(champions);
    let champsToRender: IChampPull[] = [];
    if (champions.length >= 10) {       
        if (rarityList.legendaries.length > 0) {
            champsToRender.push(...rarityList.legendaries)
        }
        if (champsToRender.length < 10) {
            champsToRender.push(...rarityList.epics)
        }
        if (champsToRender.length < 10) {
            champsToRender.push(...rarityList.rares)
        }
        if (champsToRender.length > 10) {
            champsToRender = champsToRender.slice(0, 10)
        }
    }
    else {
        //do stuff
    }
    //const legopull = await message.channel.createMessage('https://media.discordapp.net/attachments/558596438452600855/644460171937972227/legpull.gif');
    const pullImages: Buffer[] = [];
    const pullIDs = champsToRender.map(x => {
        return x.champ;
    });
    for (const id of pullIDs) {
        let response;
        try {
            response = await Axios({
                url: `https://raw.githubusercontent.com/justuscook/rsl-assets/master/RSL-Assets/HeroAvatarsWithBorders/${id}.png`,
                responseType: 'arraybuffer',
                method: 'GET'
            })
        }
        catch (e) {
            console.log(`Champion ID: ${id}\nAxios error: \n${e} Response:${response}`)
            logger.error(`Champion ID: ${id}\nAxios error: \n${e} Response:${response}`)
        }
        
        pullImages.push(response.data)
    }
    const buffer = await sharp(path.join(__dirname, '/10pull.png'))
        .composite([
            {
                input: pullImages[0],
                top: 175,
                left: 570
            },
            {
                input: pullImages[1],
                top: 175,
                left: 755
            },
            {
                input: pullImages[2],
                top: 375,
                left: 570
            },
            {
                input: pullImages[3],
                top: 375,
                left: 185
            },
            {
                input: pullImages[4],
                top: 175,
                left: 385
            },
            {
                input: pullImages[5],
                top: 375,
                left: 385
            },
            {
                input: pullImages[6],
                top: 175,
                left: 955
            },
            {
                input: pullImages[7],
                top: 375,
                left: 955
            },
            {
                input: pullImages[8],
                top: 375,
                left: 755
            },
            {
                input: pullImages[9],
                top: 175,
                left: 185
            }
        ]).toBuffer();
    return buffer;
}