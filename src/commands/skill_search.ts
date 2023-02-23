
import { CommandInteraction, ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, SelectMenuBuilder, Colors, SelectMenuOptionBuilder, MessageActionRowComponentBuilder, ChatInputCommandInteraction, ComponentType} from 'discord.js';
import { logger, mongoClient } from '../arbi';
import { IBuffDebuff } from '../general/IBuffDebuff';
import { clipText, connectToCollection, IChampionInfo, ServerSettings } from '../general/util';

export const registerforTesting = false;
export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('skill_search')    
    .setDescription('Search for buffs/debuffs and filter on skill numbers.');
export async function execute(interaction: ChatInputCommandInteraction, serverSettings?: ServerSettings): Promise<boolean> {
    await interaction.deferReply();
    try {
        const selectMenu = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(
                new SelectMenuBuilder()
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
        const buffOrDebuffMenu = new SelectMenuBuilder()
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

        const buffsMenu = new SelectMenuBuilder().setCustomId('buffs').setPlaceholder('Choose a buff');
        const debuffsMenu = new SelectMenuBuilder().setCustomId('debuffs').setPlaceholder('Choose a debuff');

        
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
        const embed: EmbedBuilder = new EmbedBuilder({
            title: "Choose the skill number to search:",
            color: Colors.Fuchsia
        })
        let skillNumber = '';
        let buffOrDebuff = '';
        let chosenEffect = '';

        await interaction.editReply({ embeds: [embed], components: [selectMenu] });
        const collector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.SelectMenu, filter: (x) => x.user === interaction.user });
        collector.on('collect', async (i) => {
            switch (i.customId) {
                case 'skill_number': {
                    skillNumber = i.values[0]
                    selectMenu.setComponents([buffOrDebuffMenu])
                    embed.data.title = 'Would you like to look for a buff or debuff?';
                    embed.setColor(Colors.Blue)
                    await i.update({ embeds: [embed], components: [selectMenu] });
                    break;
                }
                case 'buff_or_debuff': {
                    if (i.values[0] === 'buff') {
                        selectMenu.setComponents([buffsMenu])
                        embed.data.title = 'Choose a buff to look up:';
                        embed.setColor(Colors.Orange)
                        await i.update({ embeds: [embed], components: [selectMenu] });
                    }
                    else {
                        selectMenu.setComponents([debuffsMenu])
                        embed.data.title = 'Choose a debuff to look up:';
                        embed.setColor(Colors.Yellow)
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
                embed.data.title = `You didn't respond with enough info in time, try again later.`;
                embed.setColor(Colors.Red);
                interaction.editReply({ embeds: [embed], components: [] })
            }
            else {
                collection = await connectToCollection('champion_info', mongoClient);
                const champs = await collection.find<IChampionInfo>({}).toArray();
                let foundChamps: IChampionInfo[] = [];
                
                if (skillNumber === 'any') {
                    for (const c of champs) {
                        for (const s of c.skills)
                            if (s.desc.toLowerCase().includes(chosenEffect) && (s.desc.includes('places') || s.desc.includes('placing'))) {
                                foundChamps.push(c)
                                continue;
                            }
                    }
                }
                else {
                    for (const c of champs) {
                        const skill = c.skills[parseInt(skillNumber) - 1]
                        try {
                            if (skill.desc.toLowerCase().includes(chosenEffect) && (skill.desc.includes('places') || skill.desc.includes('placing'))) {
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
                embed.setColor(Colors.Green)
                embed.data.title = `Here are the champions I found with ${chosenEffect} on ${(skillNumber === 'any') ? `any skill` : `their A${skillNumber}`}:`
                embed.data.description = clipText(foundChampsNames);
                await interaction.editReply({ embeds: [embed] , components: []})
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

export const usage = `/skill-search`;




