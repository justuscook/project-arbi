import { ApplicationCommand, Client, ClientApplication, Collection, CommandInteraction, Guild, OAuth2Guild, Snowflake, Intents, ApplicationCommandResolvable, Util, TextChannel, User } from 'discord.js';
import fs from 'fs';
import express, { Response, Request } from 'express';
import bodyParser from 'body-parser';
import { clientId, guildIDs, token } from './config.json';
import { connectToCollection, Data, getAuthToken, getSpreadSheetValues, guidesSheetID, IGuide, IGuideResponse, updateFormat, validateGuide } from './general/util';
import { auth } from 'google-auth-library';
import { uploadImage } from './general/util';
import { userMention } from '@discordjs/builders';

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const client: any = new Client({ intents: [Intents.FLAGS.GUILDS] });
const app = express();
app.use(bodyParser.json());

app.listen(9001, () => {
    console.log('Listing on port 9001 ⚡');
})

app.post('/guideUpdate', async (req: Request, res: Response) => {
    const auth = await getAuthToken();
    //console.log('New guide approved!')
    res.status(200).send('Bot recieved needed info!');
    const guideResponse: IGuideResponse = req.body;
    //console.log(guideResponse)
    const row = await getSpreadSheetValues({
        sheetNameOrRange: `${guideResponse.sheetName}!R${guideResponse.range.rowStart}C${guideResponse.range.columnStart}:R${guideResponse.range.rowEnd}C${17}`,
        auth: await getAuthToken(),
        spreadsheetId: guidesSheetID
    });
    guideResponse.data = row.data.values[0];
    let dungeonGuide = false;
    if (guideResponse.data[1] === 'TRUE') dungeonGuide = true;
    let guide: IGuide = {
        author: guideResponse.data[3],
        rarity: guideResponse.data[7],
        stage: guideResponse.data[6],
        tag: (dungeonGuide) ? ['dungeon'] : ['champion', guideResponse.data[5]],
        title: guideResponse.data[4],
        data: []
    }

    const guidesSlides: Data[] = []
    const topUpload = await uploadImage(guideResponse.data[9], client, auth);
    const midUpload = await uploadImage(guideResponse.data[12], client, auth);
    const botUpload = await uploadImage(guideResponse.data[15], client, auth);
    guidesSlides.push(
        {
            desc: guideResponse.data[8],
            label: guideResponse.data[4],
            image: (guideResponse.data[10] !== '') ? guideResponse.data[10] : topUpload
        },
        {
            desc: guideResponse.data[11],
            label: (dungeonGuide) ? 'Notes:' : 'Masteries:',
            image: (guideResponse.data[13] !== '') ? guideResponse.data[13] : midUpload
        });
    if (guideResponse.data[14] !== '') {
        guidesSlides.push({
            desc: guideResponse.data[14],
            label: 'Notes:',
            image: (guideResponse.data[16] !== undefined) ? guideResponse.data[16] : botUpload
        })
    }
    guide.data.push(...guidesSlides);
    const guideErrors = validateGuide(guide);
    const chan = await client.channels.fetch('898601285748662332') as TextChannel;//guide-submission-reports
    let guider: User;
    if (guideResponse.sheetName === ('IanK Guides')) {
        guider = await client.users.fetch('205448080797990912')//205448080797990912
    }
    else {
        guider = await client.users.fetch('227837830704005140')//227837830704005140
    }
    if (guideResponse.user === 'mr.justus.cook@gmail.com') {
        guider = await client.users.fetch('269643701888745474')//269643701888745474
    }
    if (guideErrors.length < 1) {
        await chan.send(`${userMention(guider.id)}, Guide ${guide.title} has no errors! Submitting the guide now!`);

    }
    else {
        await chan.send(`${userMention(guider.id)}, (┬┬﹏┬┬) Please fix these errors in the guide:\n${guideErrors}`);
        await updateFormat(guideResponse.sheetId, guideResponse.range, auth, [1, 0, 0]);
        return;
    }
    await updateFormat(guideResponse.sheetId, guideResponse.range, auth);
    const collection = await connectToCollection('guides');
    const guides = collection.updateOne(
        { title: guide.title },
        { $set: guide },
        { upsert: true },
        async (err: any, result: any) => {
            if (err) {
                await chan.send(`╯︿╰ The guide submission/update failed.`)
            }

        });
    //console.log(guide)
    //const approvedGuides = guideRawValues.data.values.filter(x => x[0] === 'TRUE'  && x.length > 1)

    //console.log(approvedGuides);
})

client.commands = new Collection();
const commandFiles = fs.readdirSync(__dirname + '/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(__dirname + `/commands/${file}`);
    client.commands.set(command.data.name, command);
}

client.once('ready', async () => {
    console.log('Ready!');
    await deployCommands();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command: any = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

client.login(token);

async function deployCommands() {
    const commands = [];
    const globalCommands = [];
    const commandFiles = fs.readdirSync(__dirname + '/commands').filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(__dirname + `/commands/${file}`);
        if (command.registerforTesting === true)
            if (command.registerforTesting === true) {
                commands.push(command.data.toJSON());
            }
        globalCommands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '9' }).setToken(token);
    /*
        const guilds: Collection<Snowflake, OAuth2Guild> = await client.guilds.fetch();
        for(const g of guilds){
            const guild: Guild = await client.guilds.fetch(g[0])
            const commands = await guild.commands.fetch();
            const commandToDelete = commands.find(x => x.name === 'ping');
            await guild.commands.delete(commandToDelete.id);
        }
        
        if(currentCommands !== undefined){
            console.log(currentCommands)
        }
    */
    (async () => {
        try {
            const currentCommands: Collection<Snowflake, ApplicationCommand> = await client.application?.commands.fetch();
            let newGlobalCommands = [];
            for (const g of globalCommands) {
                if (currentCommands.find(x => x.name === g.name)) {
                    continue;
                }
                else {
                    newGlobalCommands.push(g);
                }
            }
            if (newGlobalCommands.length > 0) {
                const responseGlobal = await rest.put(
                    Routes.applicationCommands(clientId),
                    { body: newGlobalCommands },
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
                    Routes.applicationGuildCommands(clientId, g),
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


