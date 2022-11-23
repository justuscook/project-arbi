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
import * as promClient from 'prom-client';
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
const app = express();
app.use(cors());
app.use(express.json());
/*
app.listen(9001, () => {
    console.log('Bot Listening on port 9001 ⚡');
})*/


/*
app.get('/', (req: Request, res: Response) => {
    res.send('Bot online 🤖⚡')
})
*/
app.get('/', (req: Request, res: Response) => {
    res.status(200).send('test')
});
app.post('/guildCheck', async (req: Request, res: Response) => {
    try {
        interface GuildInfo {
            name: string
            id: string,
            botInGuild: boolean,
            hasPerms: boolean,
            icon: string
        }
        //const userPerms = new PermissionsBitField(`${req.body.userPerms}`);
        const userGuilds = req.body.userGuilds;
        let qualifyingGuilds: GuildInfo[] = [];
        //guild = await client.guilds.cache.has(userGuild);
        const hasPermsGuilds = userGuilds.filter((g) => new PermissionsBitField(`${g.permissions}`).has(['Administrator', 'ManageGuild']))
        for (const g of hasPermsGuilds) {

            const inGuild = await client.guilds.cache.has(g.id);
            const qg = {
                name: g.name,
                id: g.id,
                botInGuild: inGuild,
                hasPerms: true,
                icon: g.icon
            }
            qualifyingGuilds.push(qg);
        }

        /*
        }
        catch (err:any){
            console.log(err)
        }
        if (guild) {
            data.botInGuild = true;
        }
        if (userPerms.has(['Administrator', 'ManageGuild'])) {
            data.hasPerms = true;
        }*/
        console.log(qualifyingGuilds)
        res.send({qualifyingGuilds: qualifyingGuilds});
    }
    catch (err) {
        console.log(err)
    }
})
app.get('/botStats', async (req: Request, res: Response) => {
    const total = await client.guilds.cache;
    const collection = await connectToCollection('guide_stats', mongoClient);
    const failed = await collection.find({ success: false }).toArray();
    const successful = await collection.find({ success: true }).toArray();
    res.status(200).json({
        status: 'online',
        servers: total.size,
        failed: failed,
        successful: successful
    })
});


app.post('/prom', async (req: Request, res: Response) => {
    const response = await axios({
        url: req.body.url,
        method: 'GET',
        responseType: 'json',
        params: {
            query: req.body.query
        }
    })
    res.send(response.data);
})
app.post('/guideUpdate', async (req: Request, res: Response) => {
    const chan = await client.channels.fetch('898601285748662332') as TextChannel;//guide-submission-reports
    const auth = await getAuthToken();
    //console.log('New guide approved!')
    res.status(200).send('Bot recieved needed info!');
    const guideResponse: IGuideResponse = req.body;
    //console.log(guideResponse)
    const row = await getSpreadSheetValues({
        sheetNameOrRange: `${guideResponse.sheetName}!R${guideResponse.range.rowStart}C${1}:R${guideResponse.range.rowEnd}C${25}`,
        auth: await getAuthToken(),
        spreadsheetId: guidesSheetID
    });
    guideResponse.data = row.data.values[0];
    let dungeonGuide = false;
    let tags = [];
    (guideResponse.data[5].includes(',')) ? tags.push([...guideResponse.data[5].split(',')]) : tags.push(guideResponse.data[5].trim());
    if (guideResponse.data[1] === 'TRUE') dungeonGuide = true;
    let guide: IGuide = {
        author: guideResponse.data[3].split(', '),
        rarity: guideResponse.data[7],
        stage: guideResponse.data[6],
        tag: (dungeonGuide) ? (guideResponse.data[7]) ? [tags[0], 'dungeon', 'champion', ...tags.slice(1)] : [guideResponse.data[5], 'dungeon'] : [tags[0], 'champion'],
        title: guideResponse.data[4],
        data: []
    }
    if (tags[0].toLowerCase() === 'general') {
        guide.tag = [tags[0].toLowerCase()];
    }
    guide.tag = guide.tag.filter(x => x !== undefined);

    const guidesSlides: Data[] = []
    const topUpload = await uploadImage(guideResponse.data[9], client, auth);
    const midUpload = await uploadImage(guideResponse.data[12], client, auth);
    const botUpload = await uploadImage(guideResponse.data[15], client, auth);

    guidesSlides.push(
        {
            desc: guideResponse.data[8],
            label: guideResponse.data[4],
            image: (guideResponse.data[10]) ? guideResponse.data[10] : topUpload
        },
        {
            desc: guideResponse.data[11],
            label: (dungeonGuide) ? 'Notes:' : 'Masteries:',
            image: (guideResponse.data[13]) ? guideResponse.data[13] : midUpload
        });
    if (guideResponse.data[14].length > 0) {
        guidesSlides.push({
            desc: guideResponse.data[14],
            label: 'Notes:',
            image: (guideResponse.data[16]) ? guideResponse.data[16] : botUpload
        })
    }
    let failedImages = '';
    for (const g of guidesSlides) {
        if (g.image.includes('failed')) {
            failedImages += g.image + '\n';
        }
    }
    if (failedImages !== '') {
        await chan.send(`There here errors downloading some images:\n${failedImages}`);
    }
    if (guideResponse.data[18] !== '') {
        guide.order = parseInt(guideResponse.data[18]);
    }
    guide.data.push(...guidesSlides);
    const guideErrors = validateGuide(guide);

    let guider: User;
    if (guideResponse.user === '') guideResponse.user = 'noPing';
    if (guideResponse.user !== 'noPing') {
        if (guideResponse.user === ('iankyl93@gmail.com')) {
            guider = await client.users.fetch('205448080797990912')//205448080797990912
        }
        if (guideResponse.user === ('Origin7303@gmail.com')) {
            guider = await client.users.fetch('227837830704005140')//227837830704005140
        }
        if (guideResponse.user === 'mr.justus.cook@gmail.com') {
            guider = await client.users.fetch('269643701888745474')//269643701888745474
        }
    }
    if (guideErrors.length < 1) {
        await chan.send(`${(guideResponse.user !== 'noPing') ? userMention(guider.id) : 'Hey guys'}, Guide ${guide.title} has no errors! Submitting the guide now!`);

    }
    else {
        await chan.send(`${userMention(guider.id)}, (┬┬﹏┬┬) Please fix these errors in the guide:\n${guideErrors}`);
        await updateFormat(guideResponse.sheetId, guideResponse.range, auth, [1, 0, 0]);
        return;
    }
    await updateFormat(guideResponse.sheetId, guideResponse.range, auth);

    const collection = await connectToCollection('guides', mongoClient);
    const guides = await collection.updateOne(
        { title: guide.title },
        { $set: guide },
        { upsert: true },
        async (err: any, result: any) => {
            if (err) {
                await chan.send(`╯︿╰ The guide submission/update failed.\n${err}`)

            }
            else {

            }
        });

    //console.log(guide)
    //const approvedGuides = guideRawValues.data.values.filter(x => x[0] === 'TRUE'  && x.length > 1)

    //console.log(approvedGuides);
})
const httpServer = http.createServer(app);
httpServer.listen(81, () => {
    console.log('HTTP Server listening on port 81');
})
try {
    const httpsServer = https.createServer({
        key: fs.readFileSync('/etc/letsencrypt/live/project-arbi.online/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/project-arbi.online/fullchain.pem')
    }, app);

    httpsServer.listen(9001, () => {
        console.log('HTTPS Server listening on port 9001');
    })
}
catch {
    console.log('Testing environment.')
}

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
    bot_guilds_total.set(num.size);
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
        AddCommandToTotalCommands(commandName)
        if (commandSuccess === undefined || commandSuccess) {
            AddCommandToTotalSuccessfulCommands(commandName);
        }
        else {
            AddCommandToTotalFailedCommands(commandName);
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
        AddCommandToTotalCommands(command.data.name)
        if (commandSuccess === undefined || commandSuccess) {
            AddCommandToTotalSuccessfulCommands(command.data.name);
        }
        else {
            AddCommandToTotalFailedCommands(command.data.name);
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

const register = new promClient.Registry();

const bot_guilds_total: promClient.Gauge<string> = new promClient.Gauge({
    name: 'bot_guilds_total',
    help: 'The number of guilds the bot is in when all shards are available.'
});

const bot_commands_total: promClient.Counter<string> = new promClient.Counter({
    name: 'bot_commands_total',
    help: 'The number of commands the bot has processed.',
    labelNames: ['name']
});

const bot_commands_successful_total: promClient.Counter<string> = new promClient.Counter({
    name: 'bot_commands_successful_total',
    help: 'The number of commands the bot has processed successfully.',
    labelNames: ['name']
});

const bot_commands_failed_total: promClient.Counter<string> = new promClient.Counter({
    name: 'bot_commands_failed_total',
    help: 'The number of commands the bot has tried to process and failed.',
    labelNames: ['name']
});

const bot_guides_successful_total: promClient.Counter<string> = new promClient.Counter({
    name: 'bot_guides_successful_total',
    help: 'The number successful guide searches.',
    labelNames: ['searchTerm']
})

const bot_guides_failed_total: promClient.Counter<string> = new promClient.Counter({
    name: 'bot_guides_failed_total',
    help: 'The number failed guide searches.',
    labelNames: ['searchTerm']
})

export function AddCommandToTotalCommands(name: string) {
    bot_commands_total.labels(name).inc();
}

export function AddCommandToTotalSuccessfulCommands(name: string) {
    bot_commands_successful_total.labels(name).inc();
}

export function AddCommandToTotalFailedCommands(name: string) {
    bot_commands_failed_total.labels(name).inc();
}
/**
 * Add to successful guide search total.
 * @param {string} input CHampion name searched.
 */
export async function AddToSuccessfulGuideSearches(input: string, matched: string[], time: Date, expireAt: Date) {//matched: string[], time: Date, expireAt: Date
    bot_guides_successful_total.labels(input).inc();

    const data = {
        searchTerm: input,
        matched: matched,
        time: time,
        success: true,
        expireAt: expireAt
    }
    const collection = await connectToCollection('guide_stats', mongoClient);
    await collection.insertOne(data)
}
/**
 * Add to failed guides search total.
 * @param {string} name Champion name searched.   
 */
export async function AddToFailedGuideSearches(input: string, matched: string[], time: Date, expireAt: Date) {// 
    bot_guides_failed_total.labels(input).inc();

    const data = {
        searchTerm: input,
        matched: matched,
        time: time,
        success: false,
        expireAt: expireAt
    }
    const collection = await connectToCollection('guide_stats', mongoClient);
    await collection.insertOne(data);
}
//job
register.setDefaultLabels({
    app: 'project-arbi-bot'
});

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

setInterval(async () => {
    const num = await client.guilds.fetch();
    bot_guilds_total.set(num.size);
}, 1.8e+6);


app.get('/metrics', async (req, res) => {
    res.set('Content-Type', promClient.register.contentType)
    res.end(await promClient.register.metrics())
});
