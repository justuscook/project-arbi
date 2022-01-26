import { ApplicationCommand, Client, ClientApplication, Collection, CommandInteraction, Guild, OAuth2Guild, Snowflake, Intents, ApplicationCommandResolvable, Util, TextChannel, User, Message, Interaction, MessageEmbed } from 'discord.js';
import fs from 'fs';
import express, { Response, Request } from 'express';
import bodyParser from 'body-parser';
import { clientId, testClientId, guildIDs, token, testToken } from './config.json';
import { connectToCollection, connectToDB, Data, getAuthToken, getLeaderboard, getSpreadSheetValues, guidesSheetID, IGuide, IGuideResponse, updateFormat, validateGuide } from './general/util';
import { auth } from 'google-auth-library';
import { uploadImage } from './general/util';
import { userMention } from '@discordjs/builders';
import https from 'https';
import http from 'http';
import tracer from 'tracer';
import * as promClient from 'prom-client';

const TOKEN = token;//change before pushing live!
const CLIENTID = clientId;
export let leaderboard: Map<string,number>;
export const superUsers = ['227837830704005140', '269643701888745474', '205448080797990912']

export const logger = tracer.dailyfile({
    root: './logs',
    maxLogFiles: 7,
    allLogsFileName: 'arbi-log',
    dateformat: 'mm/dd/yyyy HH:MM'

});
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

export const client: any = new Client({
    intents:
        [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.DIRECT_MESSAGES
        ],
    partials: [
        'CHANNEL'
    ]
});
const app = express();

app.use(express.json());

try {
    const httpServer = http.createServer(app);
    const httpsServer = https.createServer({
        key: fs.readFileSync('/etc/letsencrypt/live/project-arbi.online/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/project-arbi.online/fullchain.pem')
    }, app);

    httpServer.listen(80, () => {
        console.log('HTTP Server listening on port 80');
    })

    httpsServer.listen(443, () => {
        console.log('HTTPS Server listening on port 443');
    })
}
catch {
    console.log('Testing environment.')
}

app.listen(9001, () => {
    console.log('Bot Listening on port 9001 ⚡');
})

app.get('/', (req: Request, res: Response) => {
    res.send('Bot online 🤖⚡')
})
app.post('/guideUpdate', async (req: Request, res: Response) => {
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
    let tags = [...guideResponse.data[5].split(',').map(part => part.trim()).slice(1)]
    if (guideResponse.data[1] === 'TRUE') dungeonGuide = true;
    let guide: IGuide = {
        author: guideResponse.data[3].split(', '),
        rarity: guideResponse.data[7],
        stage: guideResponse.data[6],
        tag: (dungeonGuide) ? (guideResponse.data[7]) ? [tags[0], 'dungeon', 'champion', ...tags.slice(1)]: [guideResponse.data[5], 'dungeon'] : [tags[0], 'champion'],
        title: guideResponse.data[4],
        data: []
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
    if (guideResponse.data[18] !== '') {
        guide.order = parseInt(guideResponse.data[18]);
    }
    guide.data.push(...guidesSlides);
    const guideErrors = validateGuide(guide);
    const chan = await client.channels.fetch('898601285748662332') as TextChannel;//guide-submission-reports
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
    const mongoClient = await connectToDB();
    const collection = await connectToCollection('guides', mongoClient);
    const guides = collection.updateOne(
        { title: guide.title },
        { $set: guide },
        { upsert: true },
        async (err: any, result: any) => {
            if (err) {
                await chan.send(`╯︿╰ The guide submission/update failed.\n${err}`)
            }
            else {
                await mongoClient.close();
            }
        });

    //console.log(guide)
    //const approvedGuides = guideRawValues.data.values.filter(x => x[0] === 'TRUE'  && x.length > 1)

    //console.log(approvedGuides);
})

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
    console.log('Ready!');
    await deployCommands();
    const num = await client.guilds.fetch();
    bot_guilds_total.set(num.size);
    leaderboard = await getLeaderboard();
    console.log(`Leaderboard set!`);
    setTimeout(async () => {
        leaderboard  = await getLeaderboard();
        console.log(leaderboard);
    }, 900000 );
    /*
    const collection = await connectToCollection('guides');
    const guides = await collection.find<IGuide>({}).toArray();
    const authors: Collection<string, number> = new Collection;
    for(const g of guides){
        if)
    }*/

});



client.on('messageCreate', async (message: Message) => {
    if (!superUsers.includes(message.author.id)) return;
    if (!message.mentions.has(client.user.id)) return;
    if (message.content.includes("@here") || message.content.includes("@everyone")) return;
    const commandName = message.content.split(' ')[1];
    const command = client.atCommands.get(commandName)
    if (!command) return;
    else {
        const commandSuccesss: Promise<boolean> = await command.execute(message);
    }
    /*
    if (message.mentions.has(client.user.id)) {
        if (message.content.split(' ')[1] !== 'help') {
            return;
        }
        console.log(message.content)
        const commands = await client.application.commands.fetch();
        const embed: MessageEmbed = new MessageEmbed({
            description: `${userMention((await message.author.fetch()).id)} Here is a list of my commands!`
        });
        const commandFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.js'));
        interface commandUsage {
            usage: string,
            name: string
        }
        const commandUsage: commandUsage[] = [];

        for (const file of commandFiles) {
            const command = require(__dirname + `//${file}`);
            commandUsage.push({
                name: file.replace('.js', '').toLowerCase(),
                usage: command.usage
            })
            //console.lo
        }
        for (const c of commands) {
            embed.fields.push({
                name: c[1].name,
                value: `Description: ${c[1].description}`,
                inline: false
            });
        }
        await message.reply({ embeds: [embed] });
    }*/
})
/**
 * Command/Interaction handler
 */

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command: any = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        const commandSuccess: Promise<boolean> = await command.execute(interaction);
        AddCommandToTotalCommands(command.data.name)
        if (commandSuccess) {
            AddCommandToTotalSuccessfulCommands(command.data.name);
        }
        else {
            AddCommandToTotalFailedCommands(command.data.name);
        }
    } catch (error) {
        console.error(error);
        return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

client.login(TOKEN);

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
 * @param {string} name CHampion name searched.
 */
export function AddToSuccessfulGuideSearches(name: string) {
    bot_guides_successful_total.labels(name).inc();
}
/**
 * Add to failed guides search total.
 * @param {string} name Champion name searched.   
 */
export function AddToFailedGuideSearches(name: string) {
    bot_guides_failed_total.labels(name).inc();
}

register.setDefaultLabels({
    app: 'project-arbi-bot'
});

async function deployCommands() {
    const commands = [];
    const globalCommands = [];
    const commandFiles = fs.readdirSync(__dirname + '/commands').filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(__dirname + `/commands/${file}`);
        //command.registerforTesting = true;
        if (command.registerforTesting === true) {
            commands.push(command.data.toJSON());
        }
        globalCommands.push(command.data.toJSON());
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

                for (const rg of responseGlobal) {
                    const command = client.application?.commands.fetch(rg.id);
                    const commandFile = require(__dirname + `/commands/${rg.name}`);
                    if (command.defaultPermission === false) {
                        const permissions = commandFile.permissions
                        await command.permissions.set({ permissions });
                    }
                }
            }
            console.log(`Successfully registered application commands globally!`);
            for (const g of guildIDs) {
                const response = await rest.put(
                    Routes.applicationGuildCommands(CLIENTID, g),
                    { body: commands },
                );
                const guild: Guild = await client.guilds.cache.get(g);
                if (!client.application?.owner) await client.application?.fetch();
                for (const r of response) {
                    const command = await guild?.commands.fetch(r.id);
                    const commandFile = require(__dirname + `/commands/${r.name}`);

                    if (command.defaultPermission === false) {
                        const permissions = commandFile.permissions
                        await command.permissions.set({ permissions });
                    }
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