import { Message, ActionRowBuilder, EmbedBuilder, ModalActionRowComponentBuilder, bold, userMention, ModalBuilder, TextInputBuilder, MessageActionRowComponentBuilder, ButtonBuilder, ButtonStyle, ButtonComponent, TextInputStyle, ModalSubmitInteraction, InteractionCollector, ModalMessageModalSubmitInteraction, ChatInputCommandInteraction, ButtonInteraction } from "discord.js";
import { mongoClient } from "../arbi";
import { connectToCollection, fuzzySearch, getInput, ICommandInfo, IGuide, SortByOrder } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'order',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        const args = message.content.split(' ');
        //const order = parseInt(args[args.length - 1]);
        const search = input//.replace(order.toString(), '').trim();
        try {
            let subbmittedOrder: string = '';
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
            const embed: EmbedBuilder = new EmbedBuilder({
                description: titlesString + 'Type **correct** if the order is correct already.',
                title: `Current order for ${found[0].tag[0]}`,
            })
            const correctButton = new ButtonBuilder()
                .setCustomId('correct')
                .setLabel('Correct')
                .setStyle(ButtonStyle.Danger);

            const editButton = new ButtonBuilder()
                .setCustomId('edit')
                .setLabel('Edit')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents([correctButton, editButton])
            const reply = await message.reply({
                allowedMentions: {
                    repliedUser: false
                }, embeds: [embed], components: [row]
            });
            const filter = i => i.user.id === message.author.id;
            let newOrder: Map<string, string> = new Map();
            //const collector = message.channel.createMessageCollector({ filter, max: 1, time: 15000 });

            const interactionCollector = await reply.channel.createMessageComponentCollector({ filter, max: 1, time: 1500000 })

            interactionCollector.on('collect', async (clicked: ButtonInteraction) => {
                if (clicked.isButton()) {
                    if (clicked.customId === 'correct') {
                        clicked.deferUpdate();
                        await message.reply({
                            allowedMentions: {
                                repliedUser: false
                            }, content: 'OK, thanks for verifing.  If it is still wrong in the guides command you can ping Orcinus!'
                        });
                        interactionCollector.stop;
                        return;
                    }
                    else {
                        //clicked.deferReply();
                        const textInput = new TextInputBuilder()
                            .setCustomId('order-input')
                            .setLabel('Type the order you want here:')
                            .setStyle(TextInputStyle.Short);
                        const modal = new ModalBuilder()
                            .setCustomId('order-modal')
                            .setTitle('Order:');
                        const row = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(textInput);
                        modal.addComponents(row);
                        await clicked.showModal(modal);
                        const modalSubmit = await clicked.awaitModalSubmit({ filter, time: 15000 })
                        if (modalSubmit) {
                            await modalSubmit.deferReply();
                            subbmittedOrder = modalSubmit.fields.getTextInputValue('order-input');
                            let input = subbmittedOrder.toUpperCase().split('');

                            for (const i of input) {
                                newOrder.set(i, titles.get(i))
                            }
                            let newOrderString = '';
                            for (const n of newOrder) {
                                newOrderString += `${n[0]}: ${n[1]}\n`
                            }
                            const champName = found[0].tag[0];
                            /*
                            const newTitleMessage = await message.reply({
                                allowedMentions: {
                                    repliedUser: false
                                },
                                embeds: [{
                                    title: `** Order Submission recieved! New** order for ${champName}:`,
                                    description: `${newOrderString}`
                                }]
                            })
                            */
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


                            /*await message.reply({
                                allowedMentions: {
                                    repliedUser: false
                                }, content: `${userMention(message.author.id)} the guides for ${bold(search)} were re-ordered successfully!`
                            })*/
                            await modalSubmit.followUp({
                                embeds: [{
                                    title: `** Order Submission recieved! New** order for ${champName}:`,
                                    description: `${newOrderString}`
                                }]
                            })
                        }
                    }
                }

            })
            /*
                        
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
                            let input: string[] = [];
                            
                            if(m.content.includes('<')){
                                const c = m.content.replace('!','')
                                const newInput = c.split('<')
                                input = newInput[0].split('')
                            }
                            else {
                                input= m.content.toUpperCase().split('');
                            }
                            
                           input = subbmittedOrder.toUpperCase().split('');
            
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
            
            */
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