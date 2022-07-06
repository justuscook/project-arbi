import { Message, MessageActionRow, MessageEmbed, MessageSelectMenu } from "discord.js";
import { logger, mongoClient } from "../arbi";
import { IBuffDebuff } from "../general/IBuffDebuff";
import { clipText, connectToCollection, IChampionInfo, ICommandInfo } from "../general/util";

const commandFile: ICommandInfo = {
    name: 'skill_search',
    execute: async (message: Message, input?: string): Promise<boolean> => {
        try {
            const selectMenu = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                        .setCustomId('skill_number')
                        .setMaxValues(1)
                        .setPlaceholder('Choose a skill number.')
                        .addOptions([
                            {
                                label: 'Any',
                                value: 'any'
                            },
                            {
                                label: 'A1',
                                value: '1'
                            },
                            {
                                label: 'A2',
                                value: '2'
                            },
                            {
                                label: 'A3',
                                value: '3'
                            }, {
                                label: 'A4',
                                value: '4'
                            }])
                )
            const buffOrDebuffMenu = new MessageSelectMenu()
                .setCustomId('buff_or_debuff')
                .addOptions([
                    {
                        label: 'Buff',
                        value: 'buff',
                    },
                    {
                        label: 'Debuff',
                        value: 'debuff'
                    }
                ])
    
            const buffsMenu = new MessageSelectMenu().setCustomId('buffs').setPlaceholder('Choose a buff');
            const debuffsMenu = new MessageSelectMenu().setCustomId('debuffs').setPlaceholder('Choose a debuff');
    
            
            let collection = await connectToCollection('buffs_debuffs', mongoClient);
            const buffs = await (await collection.find<IBuffDebuff>({}).toArray()).filter(x => x.type === "buff");
            const debuffs = await (await collection.find<IBuffDebuff>({}).toArray()).filter(x => x.type === "debuff");
            
            for (const b of buffs) {
                buffsMenu.addOptions([
                    {
                        label: b.name,
                        value: b.name
                    }
                ])
            }
            for (const d of debuffs) {
                debuffsMenu.addOptions([
                    {
                        label: d.name,
                        value: d.name
                    }
                ])
            }
            //selectMenu.addComponents(buffsMenu,debuffsMenu);
            const embed: MessageEmbed = new MessageEmbed({
                title: "Choose the skill number to search:",
                color: 'FUCHSIA'
            })
            let skillNumber = '';
            let buffOrDebuff = '';
            let chosenEffect = '';
    
            const selectMessage = await message.reply({ embeds: [embed], components: [selectMenu] });
            const collector = message.channel.createMessageComponentCollector({ componentType: 'SELECT_MENU', filter: (x) => x.user === message.author });
            collector.on('collect', async (i) => {
                switch (i.customId) {
                    case 'skill_number': {
                        skillNumber = i.values[0]
                        selectMenu.setComponents([buffOrDebuffMenu])
                        embed.title = 'Would you like to look for a buff or debuff?';
                        embed.setColor('BLUE')
                        await i.update({ embeds: [embed], components: [selectMenu] });
                        break;
                    }
                    case 'buff_or_debuff': {
                        if (i.values[0] === 'buff') {
                            selectMenu.setComponents([buffsMenu])
                            embed.title = 'Choose a buff to look up:';
                            embed.setColor('ORANGE')
                            await i.update({ embeds: [embed], components: [selectMenu] });
                        }
                        else {
                            selectMenu.setComponents([debuffsMenu])
                            embed.title = 'Choose a debuff to look up:';
                            embed.setColor('YELLOW')
                            await i.update({ embeds: [embed], components: [selectMenu] });
                        }
                        buffOrDebuff = i.values[0];
                        break;
                    }
                    case 'buffs':
                    case 'debuffs': {
                        chosenEffect = i.values[0].toLowerCase()
                        i.deferUpdate();
                        collector.stop();
                        break;
                    }
                }
            })
            collector.on('end', async (e) => {
                if (chosenEffect === '') {
                    embed.title = `You didn't respond with enough info in time, try again later.`;
                    embed.setColor('RED');
                    selectMessage.edit({ embeds: [embed], components: [] })
                }
                else {
                    collection = await connectToCollection('champion_info', mongoClient);
                    const champs = await collection.find<IChampionInfo>({}).toArray();
                    let foundChamps: IChampionInfo[] = [];
                    
                    if (skillNumber === 'any') {
                        for (const c of champs) {
                            for (const s of c.skills)
                                if (s.desc.toLowerCase().includes(chosenEffect) && (s.desc.toLowerCase().includes('places') || s.desc.toLowerCase().includes('placing'))) {
                                    foundChamps.push(c)
                                    continue;
                                }
                        }
                    }
                    else {
                        for (const c of champs) {
                            const skill = c.skills[parseInt(skillNumber) - 1]
                            try {
                                if (skill.desc.toLowerCase().includes(chosenEffect) && (skill.desc.toLowerCase().includes('places') || skill.desc.toLowerCase().includes('placing'))) {
                                    foundChamps.push(c)
                                }
                            }
                            catch (err) {
                                continue;
                            }
                        }
                    }
                    let foundChampsNames = '';
                    for (const f of foundChamps) {
                        foundChampsNames += `${f.name}, `;
                    }
                    embed.setColor('GREEN')
                    embed.title = `Here are the champions I found with ${chosenEffect} on ${(skillNumber === 'any') ? `any skill` : `their A${skillNumber}`}:`
                    embed.description = clipText(foundChampsNames);
                    await selectMessage.edit({ embeds: [embed] , components: []})
                }
            })
            return true;
        }
        catch (err) {
            console.log(err)
            logger.error(err)
            return false;
        }
    }
}
export default commandFile;