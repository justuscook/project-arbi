import { SlashCommandBuilder } from '@discordjs/builders';
import { time } from 'console';
import exp from 'constants';
import discord, { ApplicationCommandPermissionData, ButtonInteraction, CommandInteraction, Interaction, MessageActionRow, MessageButton, MessageComponent, MessageComponentCollectorOptions, MessageComponentInteraction, MessageEmbed, MessageSelectMenu, MessageSelectMenuOptions } from 'discord.js';
const embed: MessageEmbed = new MessageEmbed({
    color: 'GOLD',
    description: 'Guide Text'
})
const row1 = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('1')
            .setLabel('Guide 1')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('2')
            .setLabel('Guide 2')
            .setStyle('SECONDARY'),
        new MessageButton()
            .setCustomId('3')
            .setLabel('Guide 3')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('4')
            .setLabel('Guide 4')
            .setStyle('SECONDARY'),
        new MessageButton()
            .setCustomId('5')
            .setLabel('Guide 5')
            .setStyle('PRIMARY')
    );
const row2 = new MessageActionRow()
    .addComponents(

        new MessageButton()
            .setCustomId('6')
            .setLabel('Guide 6')
            .setStyle('SECONDARY'),
        new MessageButton()
            .setCustomId('7')
            .setLabel('Guide 7')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('8')
            .setLabel('Guide 8')
            .setStyle('SECONDARY'),
        new MessageButton()
            .setCustomId('9')
            .setLabel('Guide 9')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('10')
            .setLabel('Guide 10')
            .setStyle('SECONDARY')
    );
const messageSelectMenuOptions: discord.MessageSelectOptionData[] = [];

for (let i = 1; i <= 25; i++) {
    messageSelectMenuOptions.push({
        label: `Choice ${i}`,
        value: `Choice ${i}`
    })
};

const row3 = new MessageActionRow()
    .addComponents(
    new MessageSelectMenu()
        .setCustomId('Champ select')
        .addOptions(messageSelectMenuOptions)
)
export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('guide')
    .addStringOption(option => option.setName('champion_name').setDescription('Enter a champions name').setRequired(true))
    .setDescription('Search for guidesby champion or dungeon name.')
    .setDefaultPermission(false)

export async function execute(interaction: CommandInteraction) {
    const filter = i => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15 * 60 * 60 });
    collector.on('collect', async (i: MessageComponentInteraction) => {
        const message = await interaction.fetchReply() as discord.Message;
        const embed = message.embeds[0] as MessageEmbed;
        embed.description = `Button Guide ${i.customId}!`
        await message.edit({ embeds: [embed] });
        i.deferUpdate();
    })
    if (interaction.isCommand()) {
        return interaction.reply({ embeds: [embed], components: [row3] });
    }
}

export const permissions: ApplicationCommandPermissionData[] = [
    {
        id: '227837830704005140',
        type: 'USER',
        permission: true
    },
    {
        id: '269643701888745474',
        type: 'USER',
        permission: true
    },
    {
        id: '205448080797990912',
        type: 'USER',
        permission: true
    }
]

