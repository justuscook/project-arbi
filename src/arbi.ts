import { ApplicationCommand, Client, ClientApplication, Collection, CommandInteraction, Guild, OAuth2Guild, Snowflake, Intents, ApplicationCommandResolvable } from 'discord.js';
import fs from 'fs';
const { clientId, RaidServer, TestServer, token } = require('./config.json');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const client: any = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.commands = new Collection();
const commandFiles = fs.readdirSync(__dirname + '/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(__dirname + `/commands/${file}`);
    client.commands.set(command.data.name, command);
}

client.once('ready', async () => {
    console.log('Ready!');
    deployCommands();
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
    const server = TestServer;//TestServer or Raid Server
    const commands = [];
    const commandFiles = fs.readdirSync(__dirname + '/commands').filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(__dirname + `/commands/${file}`);
        commands.push(command.data.toJSON());
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
            const response = await rest.put(
                Routes.applicationGuildCommands(clientId, RaidServer),
                { body: commands },
            );

            if (!client.application?.owner) await client.application?.fetch();
            for (const r of response) {
                const command = await client.guilds.cache.get(RaidServer)?.commands.fetch(r.id);
                const commandFile = require(__dirname + `/commands/${r.name}`);
                if (command.defaultPermission === false) {
                    const permissions = commandFile.permissions
                    await command.permissions.set({ permissions });
                }
            }

            const response2 = await rest.put(
                Routes.applicationGuildCommands(clientId, TestServer),
                { body: commands },
            );

            if (!client.application?.owner) await client.application?.fetch();
            for (const r of response2) {
                const command = await client.guilds.cache.get(TestServer)?.commands.fetch(r.id);
                const commandFile = require(__dirname + `/commands/${r.name}`);
                if (command.defaultPermission === false) {
                    const permissions = commandFile.permissions
                    await command.permissions.set({ permissions });
                }
            }
            //console.log(response2)
            console.log('Successfully registered application commands.');
        } catch (error) {
            console.error(error);
        }
    })();
}

