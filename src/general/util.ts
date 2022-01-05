import { ApplicationCommandPermissionData, Client, ClientApplication, ColorResolvable, CommandInteraction, GuildMemberRoleManager, Message, MessageActionRow, MessageAttachment, MessageButton, MessageComponentInteraction, MessageEmbed, MessageEmbedOptions, TextChannel, User, Util } from "discord.js";
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
import { client } from "../arbi";
import { text } from "body-parser";

/*
export interface ICommand {
    execute: Promise<boolean>,
    registerforTesting?: boolean,
    permissions?: ApplicationCommandPermissionData[],
    usage?: string
}*/

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

/**
 * Does a fuzzy search for the given search term.
 * @param data Array of data to filter.
 * @param filter Filter or seach term.
 * @param searchType What properites to search in the JSON.
 * @returns Array of the data the meets the search requirements, no results is a 0 size array.
 */
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
/**
 * Create buttons for pagination.
 * @param {string} buttonUserID User ID to watch for, ignore others.
 * @param {Message[]} messages Messages to edit when buttons are clicked. 
 * @param {IMessageEmbeds[]} embeds Array of embeds and attachments.
 */
export async function guideButtonPagination(buttonUserID: string, messages: Message[], embeds: IMessageEmbeds[]) {
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
/**
 * SKills embeds for pagination.
 * @param {string} buttonUserID User ID to watch for, ignore others.
 * @param {Message} message Message to edit with pagination.
 * @param {MessageEmbed[]} embeds Array of skill embeds.
 */
export async function skillsButtonPagination(buttonUserID: string, message: Message, embeds: MessageEmbed[]) {
    const filter = i => i.user.id === buttonUserID;
    const collector = message.createMessageComponentCollector({ filter, time: Timeout.Mins15 });//time: util.Timeout.Mins15
    collector.on('collect', async (i: MessageComponentInteraction) => {
        await i.deferUpdate();

        await message.removeAttachments()

        await message.edit({ embeds: [embeds[parseInt(i.customId) - 1]] });
        //await messages[2].edit({ embeds: [embeds[parseInt(i.customId) - 1].botEmbed]});
        const rows = message.components;
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
            await i.editReply({ embeds: [embeds[parseInt(i.customId) - 1]], components: [rows[0], rows[1]] })
        }
        else {
            await i.editReply({ embeds: [embeds[parseInt(i.customId) - 1]], components: [rows[0]] })
        }
    });
    collector.on('end', async (x) => {
        const components = message.components;
        for (const r of components) {
            for (const c of r.components) {
                c.setDisabled(true);
            }
        }
        await message.edit({ components: components })

    });
}



export function tolower(test: string): string {
    return test.toLowerCase();
}

export async function canDM(interaction: CommandInteraction): Promise<boolean> {
    //Raid Server ID 532196192051003443
    //Mod team role ID 861626304344490034
    //testing server ID 647916859718369303
    //testing server Role id 227837830704005140
    //const RaidModRole = await (await (await interaction.client.guilds.fetch('532196192051003443')).roles.fetch('861626304344490034'));
    if (interaction.guildId === '532196192051003443') {
        if (interaction.guildId === '532196192051003443') {
            const hasRole = await (await interaction.member.roles as GuildMemberRoleManager).cache.hasAny('861626304344490034', '722765643610587177', '837319225449119785');
            if (hasRole === false) {
                return false;
            }
        }
        return true;
    }
}

export async function canShow(interaction: CommandInteraction): Promise<boolean> {
    //Raid Server ID 532196192051003443
    //Mod team role ID 861626304344490034
    //testing server ID 647916859718369303
    //testing server Role id 227837830704005140
    //const RaidModRole = await (await (await interaction.client.guilds.fetch('532196192051003443')).roles.fetch('861626304344490034'));
    if (interaction.guildId === '532196192051003443') {
        const hasRole = await (await interaction.member.roles as GuildMemberRoleManager).cache.hasAny('861626304344490034', '722765643610587177', '837319225449119785');
        if (hasRole === undefined) {
            return false;
        }
    }
    return true;
}

/**
 * Removes 'show' from input
 * @param {string} text Text to remove the word 'show' from 
 * @returns {string} Text without the word 'show'
 */
export function removeShow(text: string): string {
    text = text.toLowerCase();
    return text.replace('show', '').trim();
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
/**
 * Deletes messages after a delay.
 * @param {Message[]} messages Array of messages to delete
 * @param {number} timeout Number of milliseconds to wait before deleteing messages.  Defaults to 15 mins.
 */
export async function delayDeleteMessages(messages: Message[], timeout?: number, showInServer?: boolean) {
    if (showInServer !== undefined && showInServer === true && messages[0].guildId === '532196192051003443') {

        if (timeout === undefined) timeout = Timeout.Mins15;
        setTimeout(async () => {
            for (const m of messages) {
                await m.delete();
            }
        }, timeout);
    }
    return;
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
/**
 * Connects to the specified collection in the bots MongoDB
 * @param name 
 * @returns {Collection} MongoDB collection
 */
export async function
    connectToDB(): Promise<MongoClient> {
    const uri = `mongodb+srv://arbi:${dbpass}@arbi.g6e2c.mongodb.net/Arbi?retryWrites=true&w=majority`;
    const mongoClient: MongoClient = new MongoClient(uri);
    return mongoClient;
}
export async function
    connectToCollection(name: string, client: MongoClient): Promise<Collection> {
    await client.connect();
    const collection = await client.db('project-arbi').collection(name);
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
        const test = url.split('=')[1];
        const response: GaxiosResponse = await drive.files.get({
            fileId: url.split('=')[1],
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
        return `failed download: ${url}`;
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
            errors += `Image download failed.  File: ${g.image}\n`
        }
        if (g.desc.length > 2047) {
            errors += `Description to long, check the highlightled portion: ${bold(g.label)}:\n\"${g.desc.slice(2000, 2038)}${bold(g.desc.slice(2038, 2048))}**${g.desc.slice(2048, 2100)}\"\n`;
        }
        i++;
    }
    return errors;
}

export interface IChampionInfo {
    name: string,
    key?: string,
    id: string,
    hp: string,
    def: string,
    atk: string,
    spd: string,
    crate: string,
    cdamage: string;
    acc: string,
    res: string,
    faction: string,
    affinity: string,
    type: string,
    rarity: string,
    aura?: string,
    cheal: string,
    skills?: ISkill[],
    totalBooks?: string,
    avatar?: string
}

export interface ISkill {
    name: string,
    mincd?: string,
    maxcd: string,
    desc: string,
    books?: string,
    numBooksToMax?: string,
    basedOn: string,
    multiplier?: string
}

export function getFactionImage(faction: string): string {
    switch (faction) {
        case 'Banner Lords':
            return 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/factions/1.png';
        case 'High Elves':
            return 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/factions/2.png';
        case 'Sacred Order':
            return 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/factions/3.png';
        case 'Coven of Magi':
            return 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/factions/4.png';
        case 'Ogryn Tribes':
            return 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/factions/5.png';
        case 'Lizardmen':
            return 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/factions/6.png';
        case 'Skinwalkers':
            return 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/factions/7.png';
        case 'Orcs':
            return 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/factions/8.png';
        case 'Demonspawn':
            return 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/factions/9.png';
        case 'Undead Hordes':
            return 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/factions/10.png';
        case 'Dark Elves':
            return 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/factions/11.png';
        case 'Knights Revenant':
            return 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/factions/12.png';
        case 'Barbarians':
            return 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/factions/13.png';
        case 'Arrows':
            return 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/factions/14.png';
        case 'Shadowkin':
            return 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/factions/15.png';
        case 'Dwarves':
            return 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images/factions/16.png';
    }
}
/**
 * 
 * @param {string} rarity Champion rarity.
 * @returns {ColorResolvable} Color for the champion border.
 */
export function getColorByRarity(rarity: string): ColorResolvable {
    let color: ColorResolvable = 'GOLD';
    switch (rarity.toLowerCase()) {
        case 'common':
            color = 'LIGHT_GREY';
            break;
        case 'uncommon':
            color = 'GREEN';
            break;
        case 'rare':
            color = 0x00FFFF;
            break;
        case 'epic':
            color = 'PURPLE'
            break;
        case 'legendary':
            color = 'GOLD';
            break;
    }
    return color;
}
/**
 * Returns an embed for each skill a champion has.
 * @param {IChampionInfo} champ The champion data from MongoDB 
 * @param {boolean} avatar Wheter or not to include the champion avatar as the thumbnail. If this is used for only skills will include the champion avatar as the embed thumbnail.
 * @returns 
 */
export function getSkillsEmbeds(champ: IChampionInfo, avatar: boolean = false): MessageEmbed[] {
    const baseURL = 'https://raw.githubusercontent.com/justuscook/RaidSL-data/main/data/images//'
    const pages: MessageEmbed[] = [];
    //const hqimages = GetHQArt(champ.name);
    let count: number = 1;
    let maxBooks = 0;
    champ.skills.forEach(skill => {
        let skillNumber: string = '';

        skillNumber = `A${count.toString()} `;

        const embed: MessageEmbed = new MessageEmbed({
            color: getColorByRarity(champ.rarity),
            title: `${champ.name} - ${skillNumber}: ${skill.name}`,
            description: skill.desc,
            image: {
                url: (champ.rarity !== 'Common') ? `${baseURL}newSkills/${Number(champ.id) - 6}_s${count}.png?=${uuidv1()}` : `${baseURL}newSkills/${champ.id}_s${count}.png?=${uuidv1()}`
            },
            fields: [
                {
                    name: `Upgrades:`,
                    value: skill.books || 'No books needed.',
                    inline: false
                },
                {
                    name: `Cooldown:`,
                    value: skill.maxcd.toString(),
                    inline: true
                },
                {
                    name: `Cooldown once booked:`,
                    value: skill.mincd.toString(),
                    inline: true
                },
                {
                    name: `Damage based on:`,
                    value: skill.basedOn || 'N/A',
                    inline: true
                },
                {
                    name: 'Multiplier:',
                    value: skill.multiplier || 'N/A',
                    inline: true
                },
                {
                    name: 'Books to max skill:',
                    value: skill.numBooksToMax || 'N/A',
                    inline: true
                }

            ]
        });
        if (avatar) {
            embed.thumbnail = {
                url: (champ.rarity !== 'Common') ? `${baseURL}champions/${Number(champ.id) - 6}.png?=${uuidv1()}` : `${baseURL}champions/${champ.id}.png?=${uuidv1()}`
            }
        }

        count += 1;
        pages.push(embed);
    })
    return pages;
}

export function SortByOrder(field: any) {
    return function (a, b) {
        if (a[field] > b[field]) return 1;
        if (b[field] > a[field]) return -1;
        if (a[field] === b[field]) return 0;
        if (a[field] === undefined && b[field] !== undefined) return 1;
        if (a[field] !== undefined && b[field] === undefined) return -1;
        if (a[field] === b[field] == undefined) return 0;
        return 0;
    }
}
export async function getUserNames(users: Map<string, string>): Promise<Map<User, string>> {
    const userMap = new Map<User, string>();

    for (const u of users) {
        let user: User;
        try {
            user = client.users.fetch(u[0])
            userMap.set(user, u[1])
        }
        catch {
            user = client.user;
        }
    }
    return userMap;
}

export interface ICommandInfo {
    name: string,
    execute: any,
    options?: any
}

export function getInput(input: string): string{
    const content = input.split(' ');
    content.splice(0,2);
    return content.join(' ');

}
