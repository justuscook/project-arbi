import { SlashCommandBuilder, userMention } from '@discordjs/builders';
import * as util from '../general/util';
import { time } from 'console';
import exp from 'constants';
import discord, { ApplicationCommandPermissionData, ButtonInteraction, Client, CommandInteraction, Interaction, Message, MessageActionRow, MessageAttachment, MessageButton, MessageComponent, MessageComponentCollectorOptions, MessageComponentInteraction, MessageEmbed, MessageSelectMenu, MessageSelectMenuOptions, TextChannel, Util } from 'discord.js';
import { IntegrationExpireBehavior } from 'discord-api-types';
import { IGuide } from '../general/util';
import Axios from 'axios';
import { v1 as uuidv1 } from 'uuid';
import { drive} from 'googleapis/build/src/apis/drive';

export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('guideupdate')
    .setDefaultPermission(false)
    .addUserOption(option => option
        .setName('user_sheet')
        .setDescription('Sheet to get data from.')
        .setRequired(false)
    )
    .setDescription('Pull new guides into database.')


export async function execute(interaction: CommandInteraction) {
    interaction.deferReply();
    try {
        let user = interaction.options.getUser('user_sheet');
        let sheetName = '';
        if (user === undefined) {
            user = interaction.user;
        }
        if (user.id === '227837830704005140') {
            sheetName = 'Origin Guides';
        }
        else if (user.id === '205448080797990912') {
            sheetName = 'IanK Guides';
        }
        else {
            await interaction.followUp({ content: `${userMention(interaction.user.id)} you didn't choose a sheet...` });
            return;
        }

        const auth = await util.getAuthToken();
        const newGuides = await util.getSpreadSheetValues({
            auth,
            sheetNameOrRange: sheetName,
            spreadsheetId: util.guidesSheetID
        });
        //console.log(newGuides.data.);
        const approvedGuidesData = newGuides.data.values.filter(x => x[0] === 'TRUE');
        const guidesToUpload: IGuide[] = [];
        const collection = await util.connectToCollection('guides');
        const guides = collection.updateOne({},{},{upsert: true}, async (err: any, result: any) =>{            
        } );
        for (const g of approvedGuidesData) {
            guidesToUpload.push(await getGuideData(interaction.client, g,)); 

        }

        interaction.followUp(`Guides found ${approvedGuidesData.length}`)
    }
    catch (err) {
        console.log(err);
        await interaction.followUp(`Hmm thats not right ${err}`)
    }
}

export const permissions: ApplicationCommandPermissionData[] = [
    {
        id: '227837830704005140',
        type: 'USER',
        permission: true
    },
    {
        id: '269643701888745474',
        type: 'USER',
        permission: true
    },
    {
        id: '205448080797990912',
        type: 'USER',
        permission: true
    }
]

function GetAuthorName(text: string): string | string[] {
    let name: string | string[];

    if (text.includes(", ")) {
        let nameNotTrimmed: string[] = (text !== undefined) ? text.split(", ") : ['227837830704005140'];
        name = nameNotTrimmed.map(x => x.trim());
    }
    else {
        name = (text !== undefined || text !== '') ? text.trim() : '227837830704005140';
    }

    return name;
}

async function UploadImage(url: string, client: Client): Promise<string> {
    try {
        let newUrl = '';
        
        console.log('image upload')
        //https://drive.google.com/open?id=1dcCGezBWyJqnRkpZHrN64fBYvCCJfjYu
        const response = await Axios({
            url: url.replace('open?id=', 'uc?export=download&id='),
            method: 'GET',
            responseType: 'arraybuffer',
        });
        const imageChan: TextChannel = await client.channels.fetch('755864154409140377') as TextChannel;

        const id = uuidv1();
        const imageFile: MessageAttachment = new MessageAttachment(response.data, id);
        const imageUpload: Message = await imageChan.send({ attachments: [] })
        newUrl = imageUpload.attachments[0].url;

        return newUrl;
    }
    catch {
        return 'failed download';
    }
}

async function getGuideData(client: Client, data: string[], tags?: string[]): Promise<IGuide> {
    const author = data[11]
    const guide: IGuide = {
        author: GetAuthorName(data[11]),
        tag: tags,
        title: data[1],
        stage: data[3],
        rarity: data[4],
        data: [
            {
                desc: data[5],
                label: (tags.includes('dungeons')) ? 'Notes:' : 'Masteries',
                image: (data[6] !== '') ? data[6] : await UploadImage(data[13], client)
            },
            {
                desc: data[7],
                label: (tags.includes('dungeons')) ? 'Notes:' : 'Gear and stats',
                image: (data[8] !== '') ? data[8] : await UploadImage(data[14], client)
            }
        ]
    }
    if (data[9] !== '') {
        const description: string = data[9];
        const slideLabel: string = 'Notes:';
        let slideImage: string = '';
        if (data[10] !== '' || data[15] !== '') {
            slideImage = (data[10] !== '') ? data[10] : await UploadImage(data[15], client);
        }
        if (slideImage !== '') {
            guide.data.push({
                desc: description,
                label: slideLabel,
                image: slideImage
            })
        }
        else {
            guide.data.push({
                desc: description,
                label: slideLabel,
            })
        }
    }
    return guide

}