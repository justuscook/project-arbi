import { IChampPull } from "./IShardData";
import sharp from 'sharp';
import Axios from 'axios'
import path from "path";
import { isFunction } from "util";



export async function createTenPullImage(champions: IChampPull[]): Promise<Buffer> {
    const legendaries = champions.map(x => {
        if (x.rarity === 'legendary') {
            return x;
        }
    })
    const epics = champions.map(x => {
        if (x.rarity === 'epic') {
            return x;
        }
    })
    const rares = champions.map(x => {
        if (x.rarity === 'rare') {
            return x;
        }
    })
    if (champions.length >= 10) {
        let champsToRender = [];
        if (legendaries.length > 0) {
            champsToRender.push(...legendaries)
        }
        if (champsToRender.length < 10) {
            champsToRender.push(...epics)
        }
        if (champsToRender.length < 10) {
            champsToRender.push(...rares)
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
    const pullIDs = champions.map(x => {
        return x.champ;
    });
    for (const id of pullIDs) {
        let response;
        try {
            response = await Axios({
                url: `https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/newAvatars/${id}.png`,
                responseType: 'arraybuffer',
                method: 'GET'
            })
        }
        catch (e) {
            console.log(`Axios error: \n${e}\nChampion ID: ${id}`)
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