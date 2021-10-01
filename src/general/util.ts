import { Client, ClientApplication, Collection, CommandInteraction, GuildMemberRoleManager, Message, MessageActionRow, MessageAttachment, MessageButton, MessageComponentInteraction, MessageEmbed, MessageEmbedOptions, User, Util } from "discord.js";
import { google } from 'googleapis';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import Fuse from 'fuse.js';
import Axios from 'axios';
import { v1 as uuidv1 } from 'uuid';
import { Embed } from "@discordjs/builders";
import { TIMEOUT } from "dns";
import { time } from "console";

export enum Timeout {
    Mins15 = 900000,//900000
}
export const guidesSheetID = "1cnxxW3U0nWjLX7OyC-FqmUApwbygFC5HIi7Jl4NSbXo";

const sheets = google.sheets('v4');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
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
        const fuzzy2 = new Fuse(data, {
            keys: searchType,
            threshold: .3,
            shouldSort: true,
            findAllMatches: false,
            isCaseSensitive: false,
            includeMatches: true,
            includeScore: true,
            ignoreLocation: true
        });
        const result2 = fuzzy2.search(filter);
        bestMatch = result2.map((x: { item: any; }) => x.item);
    }
    return bestMatch;
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

