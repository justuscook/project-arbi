import { Client, ClientApplication, CommandInteraction, GuildMemberRoleManager, Message, MessageActionRow, MessageAttachment, MessageButton, MessageComponentInteraction, MessageEmbed, MessageEmbedOptions, TextChannel, User, Util } from "discord.js";
import { google } from 'googleapis';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import Fuse from 'fuse.js';
import Axios from 'axios';
import { v1 as uuidv1 } from 'uuid';
import { bold, Embed } from "@discordjs/builders";
import { TIMEOUT } from "dns";
import { time } from "console";
import { Db, MongoClient, Collection } from "mongodb";
import { dbpass } from '../config.json';
import { GaxiosResponse } from "gaxios";
import { content } from "googleapis/build/src/apis/content";
import { distance } from 'fastest-levenshtein';
export enum Timeout {
    Mins15 = 900000,//900000
}
export const guidesSheetID = "14l4H0_YPWsQjdWLgFI97a7L9KSCcFnI-mD6gFkVJGm0";
//1cnxxW3U0nWjLX7OyC-14l4H0_YPWsQjdWLgFI97a7L9KSCcFnI-mD6gFkVJGm0

const sheets = google.sheets('v4');
const drive = google.drive('v3')

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];
const projectId = 'arbi-326316'
const keyFilename = path.join(__dirname, '../key.json');
export async function getAuthToken() {
    const auth = new google.auth.GoogleAuth({
        scopes: SCOPES,
        projectId: projectId,
        keyFile: keyFilename
    });
    const authToken = await auth.getClient();
    return authToken;
}

export async function getSpreadSheet({ spreadsheetId, auth }) {
    const res = await sheets.spreadsheets.get({
        spreadsheetId,
        auth,
    });
    return res;
}

export async function getSpreadSheetValues({ spreadsheetId, auth, sheetNameOrRange }) {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        auth,
        range: sheetNameOrRange
    });
    return res;
}
export async function updateBGColor(auth) {
    const res = await sheets.spreadsheets.get({
        spreadsheetId: guidesSheetID,
        auth: auth
    });
}
export async function updateFormat(sheetId: number, range: IRange, auth, color: number[] = [0.2, 0.4, 0.05]) {
    const res = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: guidesSheetID,
        auth: auth,
        requestBody: {
            requests: [
                {
                    updateCells: {
                        range: {
                            sheetId: sheetId,
                            startRowIndex: range.rowStart - 1,
                            endRowIndex: range.rowEnd,
                            startColumnIndex: 0,
                            endColumnIndex: 1
                        },
                        rows: [
                            {
                                values: [
                                    {
                                        userEnteredFormat: {
                                            backgroundColor: {
                                                red: color[0],
                                                green: color[1],
                                                blue: color[2]
                                            }
                                        },
                                        userEnteredValue: {
                                            boolValue: false
                                        }
                                    }
                                ]
                            }
                        ],
                        fields: "userEnteredFormat,userEnteredValue"
                    }
                }
            ]
        }
    });
    console.log('request:' + res.request)
}
/*
export interface IGuide {
    aprroved: string,
    title: string,
    champion: string,
    stage: string,
    rarity: string,
    topSlide: string,
    topImage: string,
    midSlide: string,
    midImage: string,
    botSlide?: string,
    botImage?: string
    tags?: string[],
}*/


export function fuzzySearch(data: any[], filter: any, searchType: string[]) {
    let bestMatch: any[] = [];
    const fuzzy = new Fuse(data, {
        keys: searchType,
        threshold: .001,
        shouldSort: true,
        findAllMatches: false,
        isCaseSensitive: false,
        includeMatches: true,
        includeScore: true,
        distance: 5
    });
    const result = fuzzy.search(filter);
    bestMatch = result.map((x: { item: any; }) => x.item);
    if (bestMatch.length > 0) {
        return bestMatch;
    } else {
        const fuzzy2 = new Fuse(data, {
            keys: searchType,
            threshold: .3,
            shouldSort: true,
            findAllMatches: false,
            isCaseSensitive: false,
            includeMatches: true,
            includeScore: true,
            distance: 5
        });
        const result2 = fuzzy2.search(filter);
        bestMatch = result2.map((x: { item: any; }) => x.item);
    }
    if (bestMatch.length > 0) {
        return bestMatch;
    }
    else {
        const fuzzy3 = new Fuse(data, {
            keys: searchType,
            threshold: .5,
            shouldSort: true,
            findAllMatches: false,
            isCaseSensitive: false,
            includeMatches: true,
            includeScore: true,
            ignoreLocation: true
        });
        const result3 = fuzzy3.search(filter);
        bestMatch = result3.map((x: { item: any; }) => x.item);
    }
    return bestMatch;
   
}
export function matchStrength(target: string, match: string): number {
    if (target.length === 0 || match.length === 0) {
        return 0;
    }
    const d = distance(target.toLocaleLowerCase(), match.toLocaleLowerCase());
    return (match.length - (d - Math.max(0, target.length - match.length))) / match.length;
}

export async function getMessageAttacment(image: string): Promise<MessageAttachment> {
    let imageDownload;
    if (image.includes('open?id')) {
        imageDownload = await Axios({
            url: image.replace('open?id=', 'uc?export-download&id='),
            method: 'GET',
            responseType: 'arraybuffer'
        });
    }
    else {
        imageDownload = await Axios({
            url: image,
            method: 'GET',
            responseType: 'arraybuffer'
        });
    }
    const id = uuidv1();
    return new MessageAttachment(imageDownload.data, `${id}.png`);
}

export interface IMessageEmbeds {
    topEmbed: MessageEmbed,
    midEmbed: MessageEmbed,
    botEmbed: MessageEmbed,
    topImage?: MessageAttachment,
    midImage?: MessageAttachment,
    botImage?: MessageAttachment
}

export async function buttonPagination(buttonUserID: string, messages: Message[], embeds: IMessageEmbeds[]) {
    const filter = i => i.user.id === buttonUserID;
    const collector = messages[2].createMessageComponentCollector({ filter, time: Timeout.Mins15 });//time: util.Timeout.Mins15
    collector.on('collect', async (i: MessageComponentInteraction) => {
        await i.deferUpdate();
        //message = await interaction.fetchReply() as Message;
        for (const m of messages) {
            await m.removeAttachments()
        }
        await messages[0].edit({ embeds: [embeds[parseInt(i.customId) - 1].topEmbed] });
        await messages[1].edit({ embeds: [embeds[parseInt(i.customId) - 1].midEmbed] });
        //await messages[2].edit({ embeds: [embeds[parseInt(i.customId) - 1].botEmbed]});
        const rows = messages[2].components;
        for (const row of rows) {
            for (const b of row.components) {
                if (b.customId !== i.customId) {
                    (b as MessageButton).setStyle('SUCCESS')
                }
                else {
                    (b as MessageButton).setStyle('PRIMARY')
                }
            }
        }
        if (rows.length > 1) {
            await i.editReply({ embeds: [embeds[parseInt(i.customId) - 1].botEmbed], components: [rows[0], rows[1]] })
        }
        else {
            await i.editReply({ embeds: [embeds[parseInt(i.customId) - 1].botEmbed], components: [rows[0]] })
        }
    });
    collector.on('end', async (x) => {
        for (const m of messages) {
            for (const r of m.components) {
                for (const c of r.components) {
                    c.setDisabled(true);
                }
            }
            await m.edit({ components: m.components })
        }
    });
}

export function tolower(test: string): string {
    return test.toLowerCase();
}

export async function canShowInServerOrDM(interaction: CommandInteraction): Promise<boolean> {
    //Raid Server ID 532196192051003443
    //Mod team role ID 861626304344490034
    //testing server ID 647916859718369303
    //testing server Role id 227837830704005140
    //const RaidModRole = await (await (await interaction.client.guilds.fetch('532196192051003443')).roles.fetch('861626304344490034'));
    if (interaction.guildId === '532196192051003443') {
        const role = await (await interaction.member.roles as GuildMemberRoleManager).cache.find(x => x.id === '861626304344490034');
        if (role === undefined) {
            return false;
        }
    }
    return true;
}

export function removeShow(text: string): string {
    text = text.toLowerCase();
    return text.replace('show', '');
}

export interface IGuide {
    tag: string[];
    title: string;
    author: string[] | string;
    data: Data[];
    stage: string;
    rarity: string;
    order?: number;
}

export interface Data {
    label: string;
    desc: string;
    image?: string;
}

export async function inboxLinkButton(user: User): Promise<MessageActionRow> {
    const inbox = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setLabel('Inbox')
                .setStyle('LINK')
                .setURL(`https://discord.com/channels/@me/${await (await user.createDM()).id}`)
        );
    return inbox;
}

export async function delayDeleteMessage(message: Message, timeout?: number) {
    if (timeout === undefined) timeout = Timeout.Mins15;
    setTimeout(async () => {
        await message.delete();
    }, timeout);
}

export async function GetAuthor(client: Client, authorIDs: string[] | string): Promise<User[]> {
    let authors: User[] = [];
    if (!Array.isArray(authorIDs)) {
        let author: User;
        try {
            author = await client.users.fetch(authorIDs);
        }
        catch {
            author = await client.users.fetch('888450658397741057');
        }
        authors.push(author);
    }
    else {
        for (const a of authorIDs) {
            let author: User;
            try {
                author = await client.users.fetch(a);
            }
            catch {
                author = await client.users.fetch('888450658397741057');
            }
            authors.push(author);
        }
    }

    return authors;
}

export function getGuideList(guide_data: IGuide[]): string[] {
    let totalChampGuides = 0;
    let guides = '';
    const champs: string[] = [];
    guide_data = guide_data.sort((a, b): number => {
        if (a.tag > b.tag) return 1;
        if (a.tag < b.tag) return -1;
        return 0;
    });
    for (const g of guide_data) {
        totalChampGuides += 1;
        if (champs.includes(g.tag[0].trim())) {
            continue;
        }
        if (g.tag.includes('champion')) champs.push(g.tag[0].trim());
        else guides += `${g.title}\n`
    }
    let champions = `There are ${totalChampGuides.toString()} guides in our database for ${champs.length} champions:\n\n`;
    let champions2 = '';
    const index1 = ((champs.length + (champs.length % 2)) / 2);
    const index2 = ((champs.length - (champs.length % 2)) / 2);
    for (let i = 0; i < index1; i++) {
        champions += `${champs[i]}, `
    }
    for (let i = index1; i < index2 + index1; i++) {
        champions2 += `${champs[i]}, `
    }
    champions = champions.trim().substring(0, champions.length - 2);
    guides = guides.trim();
    return [champions, champions2, guides];
}
export async function connectToCollection(name: string): Promise<Collection> {
    const uri = `mongodb+srv://arbi:${dbpass}@arbi.g6e2c.mongodb.net/Arbi?retryWrites=true&w=majority`;
    const mongoClient: MongoClient = new MongoClient(uri);
    await mongoClient.connect();
    const collection = await mongoClient.db('project-arbi').collection(name);
    return collection;
}
export interface IRange {
    columnEnd: number,
    columnStart: number,
    rowEnd: number,
    rowStart: number
}
export interface IGuideResponse {
    range: IRange,
    sheetName: string,
    sheetId: number,
    data?: string[],
    user?: string
}

export async function uploadImage(url: string, client: Client, auth): Promise<string> {
    try {
        let newUrl = '';
        //console.log('image upload')
        //https://drive.google.com/open?id=1dcCGezBWyJqnRkpZHrN64fBYvCCJfjYu
        /*
                const response = await Axios({
                    url: url.replace('open?id=', 'uc?export=download&id='),
                    method: 'GET',
                    responseType: 'arraybuffer',
                });
                */
        const test = url.substring(url.indexOf('=') + 1);
        const response: GaxiosResponse = await drive.files.get({
            fileId: url.substring(url.indexOf('=') + 1),
            alt: 'media',
            auth: auth
        }, {
            responseType: 'arraybuffer'
        })
        const imageChan: TextChannel = await client.channels.fetch('897175894949523557') as TextChannel;

        const id = uuidv1();
        const imageFile: MessageAttachment = new MessageAttachment(Buffer.from(response.data), `${id}.png`);
        const imageUpload: Message = await imageChan.send({ files: [imageFile] })
        newUrl = imageUpload.attachments.first().url;

        return newUrl;
    }
    catch (err) {
        console.log(err);
        return 'failed download';
    }
}

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

export function validateGuide(guide: IGuide): string {
    let i = 1;
    let errors = '';
    for (const g of guide.data) {
        if (g.image === 'failed download') {
            errors += `age`
        }
        if (g.desc.length > 2047) {
            errors += `Description to long, check the highlightled portion: ${bold(g.label)}:\n\"${g.desc.slice(2000, 2038)}${bold(g.desc.slice(2038, 2048))}**${g.desc.slice(2048, 2100)}\"\n`;
        }
        i++;
    }
    return errors;
}