import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, MessageEmbed } from 'discord.js';
import { logger, mongoClient } from '../arbi';
import { IBuffDebuff } from '../general/IBuffDebuff';
import { connectToCollection, fuzzySearch } from '../general/util';

export const registerforTesting = false;
export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('debuff')
    .addStringOption(option => option
        .setName('input')
        .setDescription('Enter the name of the buff/debuff you would liek to search for.')
        .setRequired(true))
    .setDefaultPermission(true)    
    .setDescription('Search for a given buff/debuff definition from the in game FAQ.');
export async function execute(interaction: CommandInteraction) : Promise<boolean>{
    await interaction.deferReply();
    try {
        
        const collection = await connectToCollection('buffs_debuffs', mongoClient);
        const buffs = await collection.find<IBuffDebuff>({}).toArray();
        
        const searchText = interaction.options.getString('input');
        const embed: MessageEmbed = new MessageEmbed();
        const found: IBuffDebuff[] = fuzzySearch(buffs,searchText,['name']);
        if(found.length > 0){
            embed.setDescription(found[0].desc)
            embed.setImage(found[0].image)
            embed.setTitle(found[0].name);
        }
        else {
            embed.setDescription(`I didn't find any results for ${searchText}, please try your search again.`)
        }
        await interaction.followUp({
            allowedMentions: {
                repliedUser: false
            }, embeds: [embed]
        });
        return true;
    }
    catch (err) {
        console.log(err)
        logger.error(err)
        return false;
    }
}

export const usage = `/debuff poison`;





