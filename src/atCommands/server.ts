import axios from "axios";
import { Message, EmbedBuilder } from "discord.js";
import { connectToCollection, fuzzySearch, getInput, ICommandInfo, IGuide } from "../general/util";
import {JSDOM} from 'jsdom';

const commandFile: ICommandInfo = {
    name: 'server',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        const response = await axios({
            url: "https://raid-support.zendesk.com/api/v2/help_center/en-us/articles/360017253919.json",
            responseType: 'json'
        })
        const dom = new JSDOM(response.data.article.body)
        const statusText = dom.window.document.querySelector('span').textContent;
        const title = response.data.article.title;
        const embed: EmbedBuilder = new EmbedBuilder(
            {
                description: statusText,
                author: {
                    name: title,
                    iconURL: 'https://play-lh.googleusercontent.com/xJWR1EUl16rvKtmZRvF9p1AHEp8lIZfuRIRLLgNG69v3Gy8dU92sVHq_braXuz0vQAo=s180-rw'
                },
                footer: {
                    text: 'Currently this is only for US region.'
                }
            }
        )
        await message.reply({allowedMentions: {
            repliedUser: false
        },embeds: [embed]})
        return true;
    },
    restricted: false
}
export default commandFile;
