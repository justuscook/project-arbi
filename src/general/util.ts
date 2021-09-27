import { Client, Collection, CommandInteraction, GuildMemberRoleManager, Message, MessageActionRow, MessageAttachment, MessageButton, MessageComponentInteraction, MessageEmbed, MessageEmbedOptions, User, Util } from "discord.js";
import Google, { google } from 'googleapis';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import Fuse from 'fuse.js';
import Axios from 'axios';
import { v1 as uuidv1 } from 'uuid';
import { Embed } from "@discordjs/builders";

export enum Timeout {
    Mins15 = 900000,//900000
}

export enum EmbedColor {
    PURPLE = 0xFF00FF,
    YELLOW = 0xFFFF00,
    BLACK = 0x000000,
    GREY = 0xCAC8C8,
    ORANGE = 0xFF8C00,
    BLUE = 0x00FFFF
}

export const guidesSheetID = "1cnxxW3U0nWjLX7OyC-FqmUApwbygFC5HIi7Jl4NSbXo";


const sheets = google.sheets('v4');
const drive = google.drive('v3');

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

export async function getSpreadSheetValues({ spreadsheetId, auth, sheetName }) {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        auth,
        range: sheetName
    });
    return res;
}
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
}


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
            threshold: .35,
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

export async function getMessageAttacment(image: string): Promise<MessageAttachment | undefined> {
    let imageDownload;
    const id = uuidv1();
    if (image !== undefined) {
        if (image.includes('open?id')) {
            imageDownload = await drive.files.get({
                fileId: image.substr(image.indexOf('=') + 1, image.length - image.indexOf('=')),
                auth: await getAuthToken(),
                alt: 'media'
            }, {
                responseType:
                    'text'
            });            
            return new MessageAttachment(Buffer.from(imageDownload.data), `${id}.png`);
        }
        else {
            imageDownload = await Axios({
                url: image,
                method: 'GET',
                responseType: 'arraybuffer'
            });
            return new MessageAttachment(imageDownload.data, `${id}.png`);
        }
    }
    return undefined;
}

export interface IMessageEmbeds {
    topEmbed: MessageEmbed,
    midEmbed: MessageEmbed,
    botEmbed: MessageEmbed,
    topImage: MessageAttachment,
    midImage: MessageAttachment,
    botImage: MessageAttachment
}

export async function buttonPagination(buttonUserID: string, message: Message, embeds: IMessageEmbeds[]) {
    const filter = i => i.user.id === buttonUserID;
    const collector = message.channel.createMessageComponentCollector({ filter, time: Timeout.Mins15 });//time: util.Timeout.Mins15
    collector.on('collect', async (i: MessageComponentInteraction) => {
        i.deferUpdate();
        //message = await interaction.fetchReply() as Message;
        message.removeAttachments()
        await message.edit({ embeds: [embeds[parseInt(i.customId) - 1].topEmbed, embeds[parseInt(i.customId) - 1].midEmbed, embeds[parseInt(i.customId) - 1].botEmbed], files: [embeds[parseInt(i.customId) - 1].topImage, embeds[parseInt(i.customId) - 1].midImage, embeds[parseInt(i.customId) - 1].botImage] });
    });
    collector.on('end', async (x) => {
        for (const m of message.components) {
            for (const b of m.components) {
                b.setDisabled(true);
            }
        }
        await message.edit({ components: message.components })
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
    if (interaction.guildId === '647916859718369303') {
        const role = await (await interaction.member.roles as GuildMemberRoleManager).cache.find(x => x.id === '227837830704005140');
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


export function delayDeteleMessage(message: Message, time?: number) {
    if (!time) time = Timeout.Mins15;
    setTimeout(async () => {
        await message.delete();
    }, time)
}

export function simpleEmbed(text: string): Embed {
    const embed: Embed = new Embed({
        description: text,
        color: EmbedColor.YELLOW
    })
    return embed;
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

import { distance } from 'fastest-levenshtein';

export function matchStrength(target: string, match: string): number {
    if (target.length === 0 || match.length === 0) {
        return 0;
    }
    const d = distance(target.toLocaleLowerCase(), match.toLocaleLowerCase());
    return (match.length - (d - Math.max(0, target.length - match.length))) / match.length;
}

export function getSortedResults(someStringArray: string[], queryString: string) {
    return someStringArray.sort((a, b) => matchStrength(a, queryString) - matchStrength(b, queryString));
}