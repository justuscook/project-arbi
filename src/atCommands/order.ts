import { bold, Embed, userMention } from "@discordjs/builders";
import { Message, MessageEmbed } from "discord.js";
import { title } from "process";
import { mongoClient } from "../arbi";
import { connectToCollection, fuzzySearch, getInput, ICommandInfo, IGuide, SortByOrder } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'order',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        const args = message.content.split(' ');
        //const order = parseInt(args[args.length - 1]);
        const search = input//.replace(order.toString(), '').trim();
        try {
            
            const collection = await connectToCollection('guides', mongoClient);
            const guides = await collection.find<IGuide>({}).toArray();

            /*if (isNaN(order)) {
                message.reply(`${userMention(message.author.id)} I couldnt tell what number to use for the order!`)
                return true;
            }*/
            const found: IGuide[] = fuzzySearch(guides, search, ['tag', 'title']);
            let titles: Map<string, string> = new Map();
            found.sort(SortByOrder('order'));
            let i = 0;
            //A, Title of Guide
            for (const f of found) {
                titles.set(String.fromCharCode('A'.charCodeAt(0) + i), f.title)
                i++;
            }
            let titlesString = ' ';
            for (const t of titles) {
                titlesString += `${t[0]}: ${t[1]}\n`
            }
            const embed: MessageEmbed = new MessageEmbed({
                description: titlesString + 'Type **correct** if the order is correct already.',
                title: `Current order for ${found[0].tag[0]}`,
            })
            await message.reply({
                allowedMentions: {
                    repliedUser: false
                }, embeds: [embed]
            });
            const filter = m => m.author.id === message.author.id;
            let newOrder: Map<string, string> = new Map();
            const collector = message.channel.createMessageCollector({ filter, max: 1, time: 15000 });
            collector.on('collect', async (m: Message) => {
                if (m.content.toLowerCase() === 'correct') {
                    message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, content: 'OK, thanks for verifing.  If it is still wrong in the guides command you can ping Orcinus!'
                    });
                    
                    return;
                }
                if ((!m.content.toLowerCase().includes('a') && !m.content.toLowerCase().includes('b')) || m.content.length != found.length) {
                    message.reply({
                        allowedMentions: {
                            repliedUser: false
                        }, content: 'Your input doesn\'t seem to be right, please try the command again.'
                    });
                    return;
                }
                const input: string[] = m.content.toUpperCase().split('');

                for (const i of input) {
                    newOrder.set(i, titles.get(i))
                }
                let newOrderString = '';
                for (const n of newOrder) {
                    newOrderString += `${n[0]}: ${n[1]}\n`
                }
                const champName = found[0].tag[0];

                const newTitleMessage = await message.reply({
                    allowedMentions: {
                        repliedUser: false
                    },
                    embeds: [{
                        title: `**New** order for ${champName}:`,
                        description: `${newOrderString}`
                    }]
                })
                let orderNum = 1;
                const newGuides: IGuide[] = [];
                for (const x of newOrder) {
                    const guide = found.find(y => y.title === x[1]);
                    guide.order = orderNum;
                    newGuides.push(guide);
                    orderNum++;
                }
                for (const ng of newGuides) {
                    await collection.updateOne({ title: ng.title }, { $set: { "order": ng.order } }, { upsert: true });
                }

                
                await message.reply({
                    allowedMentions: {
                        repliedUser: false
                    }, content: `${userMention(message.author.id)} the guides for ${bold(search)} were re-ordered successfully!`
                })
            });
            

        }
        catch (err) {
            await message.reply({
                allowedMentions: {
                    repliedUser: false
                }, content: `${userMention(message.author.id)} the guides for ${bold(search)} were not re-ordered, something went wrong!`
            })

        }

        return true;
    },
    restricted: true
}
export default commandFile;