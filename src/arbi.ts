import { ApplicationCommand, Client, ClientApplication, Collection, CommandInteraction, Guild, OAuth2Guild, Snowflake, ApplicationCommandResolvable, TextChannel, User, Message, Interaction, EmbedBuilder, GuildChannel, Role, Partials, userMention, PermissionsBitField, REST, ChatInputCommandInteraction } from 'discord.js';
import fs from 'fs';
import { GatewayIntentBits, Routes } from 'discord-api-types/v10'
import express, { Response, Request } from 'express';
import { clientId, testClientId, guildIDs, token, testToken } from './config.json';
import { connectToCollection, connectToDB, Data, getAuthToken, getLeaderboard, getSpreadSheetValues, getTop, guidesSheetID, handelError, IGuide, IGuideResponse, updateFormat, validateGuide } from './general/util';
import './ws-polyfill.js'
import { uploadImage } from './general/util';
import https from 'https';
import http from 'http';
import tracer from 'tracer';
import axios from 'axios';
import cors from 'cors';
import { IShardData } from './general/IShardData';
import { get, trusted } from 'mongoose';
import { MongoClient } from 'mongodb';
//db2 pass 8Pi7AwyUjlOOfgWm
//connection string mongodb+srv://arbi:<password>@cluster0.iuswecc.mongodb.net/test
/*
const api = useRaidToolkitApi(IAccountApi);
const account = (await api.getAccounts())[0];
let accountDump = await api.getAccountDump(account.id);*/



let TOKEN = token;
let CLIENTID = clientId;
let ip = '';
export let mongoClient: MongoClient;
export let leaderboard: Map<string, number>;
export let topText: string;
export const superUsers = ['227837830704005140', '269643701888745474', '205448080797990912']

export const logger = tracer.dailyfile({
    root: './logs',
    maxLogFiles: 7,
    allLogsFileName: 'arbi-log',
    dateformat: 'mm/dd/yyyy HH:MM'

});

export const client: any = new Client({
    intents:
        [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.DirectMessageReactions
        ],
    partials: [
        Partials.Channel, Partials.Reaction, Partials.Message
    ]
});

client.atCommands = new Collection();
const atCommandFiles = fs.readdirSync(__dirname + '/atCommands').filter(file => file.endsWith('.js'));

for (const file of atCommandFiles) {
    const command = require(__dirname + `/atCommands/${file}`).default;
    client.atCommands.set(command.name, command);
}

client.commands = new Collection();
const commandFiles = fs.readdirSync(__dirname + '/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(__dirname + `/commands/${file}`);
    client.commands.set(command.data.name, command);
}

client.once('ready', async () => {
    mongoClient = await connectToDB();
    console.log('Ready!');
    await deployCommands();
    const num = await client.guilds.fetch();
    leaderboard = await getLeaderboard();
    topText = await getTop();
    setInterval(async () => {
        topText = await getTop();
        leaderboard = await getLeaderboard();
    }, 900000);
    /*
    const collection = await connectToCollection('guides');
    const guides = await collection.find<IGuide>({}).toArray();
    const authors: Collection<string, number> = new Collection;
    for(const g of guides){
        if)
    }*/

});


client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;

    if (message.content.includes("@here") || message.content.includes("@everyone")) return;
    let botRole: Role;
    if (message.inGuild()) {
        botRole = message.guild.roles.botRoleFor(client.user.id)
        if (!message.mentions.roles.has(botRole.id) && !message.mentions.has(client.user.id)) return;
    }

    let commandName = message.content.toLowerCase().split(' ')[1];
    let input: string;
    if (commandName == '') {
        commandName = message.content.toLowerCase().split(' ')[2];
        input = message.content.split(' ').slice(3).join(' ').trimEnd().trimStart();
    }
    else {
        input = message.content.split(' ').slice(2).join(' ').trimEnd().trimStart();
    }
    const command = client.atCommands.get(commandName)
    console.log(client.atCommands)
    if (!command) return;
    if (command.restricted) {
        if (!superUsers.includes(message.author.id)) {
            return;
        }
    }
    try {
        const commandSuccess: Promise<boolean> = await command.execute(message, input);
        
        if (commandSuccess === undefined || commandSuccess) {
        }
        else {
            const errorChan: TextChannel = await client.channels.fetch('958715861743579187');
            await errorChan.send(`${await client.users.fetch('269643701888745474')}Error in ${commandName} check the bot logs!`);
        }
    } catch (error) {

        logger.error(error);
        console.log(`$Error in {commandName}:\n${error}`)
        const errorChan: TextChannel = await client.channels.fetch('958715861743579187');
        await errorChan.send(`${await client.users.fetch('269643701888745474')}Error in ${commandName}: \n${error}`);
    }

})
/**
 * Command/Interaction handler
 */

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command: any = client.commands.get(interaction.commandName);

    if (!command) return;

    try {

        const commandSuccess: Promise<boolean> = await command.execute(interaction);
        if (commandSuccess === undefined || commandSuccess) {
        }
        else {
            const errorChan: TextChannel = await client.channels.fetch('958715861743579187');
            await errorChan.send(`${await client.user.fetch('269643701888745474')}Error in ${command.data.name}, check the logs!`);
        }
    } catch (error) {
        logger.error(error);
        console.log(error)
        const errorChan: TextChannel = await client.channels.fetch('958715861743579187');
        await errorChan.send(`${await client.user.fetch('269643701888745474')}Error in ${command.data.name}: \n${error}`);
        return interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});
function connectBot() {

    axios({
        url: 'https://api.ipify.org?format=json',
        method: 'GET',
        responseType: 'json',
    }).then((res) => {
        ip = res.data.ip
        if (ip !== '144.172.71.45') {
            TOKEN = testToken;
            CLIENTID = testClientId;
        }

        client.login(TOKEN);
    })
    //client.login(TOKEN);
}

connectBot();

async function deployCommands() {
    const commands = [];
    const globalCommands = [];
    const commandFiles = fs.readdirSync(__dirname + '/commands').filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(__dirname + `/commands/${file}`);
        //if (ip !== '144.172.71.45') command.registerforTesting = true;
        if (command.registerforTesting === true) {
            commands.push(command.data.toJSON());
        }
        else {
            globalCommands.push(command.data.toJSON());
        }

    }

    const rest = new REST({ version: '9' }).setToken(TOKEN);
    /*
        const guilds: Collection<Snowflake, OAuth2Guild> = await client.guilds.fetch();
        for (const g of guilds) {
            const guild: Guild = await client.guilds.fetch(g[0])
            const commands = await guild.commands.fetch();
            const commandToDelete = commands.find(x => x.name === 'leaderboard');
            if (commandToDelete === undefined) continue;
            const ID = commandToDelete.id;
            await guild.commands.delete(ID);
        }
        */
    //const deleteCommand= await client.application?.commands.fetch('910998948515282954');
    //await deleteCommand.delete()

    /*
    if(currentCommands !== undefined){
        console.log(currentCommands)
    }*/

    (async () => {
        try {/*
            const currentCommands: Collection<Snowflake, ApplicationCommand> = await client.application?.commands.fetch();
            let newGlobalCommands = [];
            for (const g of globalCommands) {
                //newGlobalCommands.push(g);//fix global command permissions
                if (currentCommands.find(x => x.name === g.name)) {
                    continue;
                }
                else {
                    newGlobalCommands.push(g);
                }
            }*/
            if (globalCommands.length > 0) {
                const responseGlobal = await rest.put(
                    Routes.applicationCommands(CLIENTID),
                    { body: globalCommands },
                );
            }
            console.log(`Successfully registered application commands globally!`);
            for (const g of guildIDs) {
                const response: any = await rest.put(
                    Routes.applicationGuildCommands(CLIENTID, g),
                    { body: commands },
                );
                const guild: Guild = await client.guilds.cache.get(g);
                if (!client.application?.owner) await client.application?.fetch();
                for (const r of response) {
                    const command = await guild?.commands.fetch(r.id);
                    const commandFile = require(__dirname + `/commands/${r.name}`);
                    /*
                                        if (command.defaultMemberPermissions.has(PermissionsBitField.Flags.UseApplicationCommands)) {
                                            const permissions = commandFile.permissions
                                            await command.permissions.set({ permissions });
                                        }
                                        */
                }
                //console.log(response2)
                console.log(`Successfully registered application commands in ${guild.name}.`);
            }
        }
        catch (error) {
            console.error(error);
        }
    })();
}
