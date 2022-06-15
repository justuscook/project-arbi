import { bold, codeBlock, userMention } from "@discordjs/builders";
import { CollectorFilter, GuildMember, Interaction, Message, MessageEmbed, MessageReaction, ReactionCollector, User } from "discord.js";
import { IShardData, msToTime } from "../general/IShardData";
import { clipText, connectToCollection, connectToDB, fuzzySearch, getInput, getTop, IChampionInfo, ICommandInfo, IGuide } from "../general/util";
import { topText } from '../arbi';

let easy: string[] = [];
let brutal: string[] = [];
let nightmare: string[] = [];
let words: string[] = [];
//let channelsInUse: string[] = [];

const commandFile: ICommandInfo = {
  name: 'hangman',
  execute: async (message: Message, input?: string): Promise<boolean> => {
    try {
      //if (!channelsInUse.includes(message.channelId)) {
        //channelsInUse.push(message.channelId);
        await calcDifficulties();
        switch (input.toLowerCase()) {
          case 'easy': {
            words = easy;
            break;
          }
          case 'brutal': {
            words = brutal
            break;
          }
          case 'nightmare': {
            words = nightmare
            break;
          }
          default: {
            await message.reply({
              allowedMentions: {
                repliedUser: false
              }, content: `${message.author} please choose easy, brutal, or nightmare for difficulty and try again.`
            });
            return true;
          }
        }
        const random = getRandomIntInclusive(1, words.length)
        const word = words[random - 1];
        const wrongGuesses = [];
        const wordOnlyLetters = word.toLowerCase().replace(/[^\w]/g, '');
        let regex: RegExp = getMatchedRegEx();
        let wordFiltered = word.replace(regex, '_ ');
        let wordUpdated = wordFiltered;
        //const filter = m => m.author.id === message.author.id;
        const filter = (reaction: MessageReaction, user: User) => {
          return user.id === message.author.id
        }
        let guesses: string[] = [];
        const gameEmbed: MessageEmbed = new MessageEmbed()
          .setDescription(codeBlock(wrongs[0]))
          .setTitle('Guess the champion!')
          .addField('How to play:', 'Use letter reactions :regional_indicator_a::regional_indicator_b::regional_indicator_c:...:regional_indicator_z: to guess letters.')
          .addField('Difficulty:', input, false)
          .addField('Guesses:', (guesses.length === 0) ? 'None yet' : guesses.join('').toUpperCase(), false)
          .addField("Your word:", codeBlock(wordFiltered))
          .setFooter({text:'React by the ❓ to guess letters.'})
          .setAuthor({name: `${(message.member) ? ((message.member.nickname) ? message.member.nickname : message.author.username) : message.author.username}\'s hangman game.`,iconURL: message.author.avatarURL()})
        //.setImage('https://cdn.discordapp.com/attachments/897175894949523557/976970756871290890/unknown.jpg')
        const game = await message.channel.send({ embeds: [gameEmbed] })
        await game.react('❓');
        const collector = game.createReactionCollector({ filter, time: 15 * 60 * 1000 })
        collector.on('collect', async (reaction: MessageReaction, user: User) => {
          const gameBoard = reaction.message;
          const newEmbed = gameBoard.embeds[0];
          if (reaction.emoji.name === '🛑') {
            collector.stop();            
          }
          const unicodeGuess = reaction.emoji.name;
          const guess = emojiToLetter(unicodeGuess)
          if (guess === 'none') {
            return;
          }
          if (!guesses.includes(guess)) {

            guesses.push(guess);
            regex = getMatchedRegEx(guesses);
            wordFiltered = word.replace(regex, '_ ');
            newEmbed.fields[3].value = codeBlock(wordFiltered)
            newEmbed.fields.find(x => x.name === 'Guesses:').value = guesses.join(' ');
            if (!word.toLocaleLowerCase().includes(guess)) {
              if (!wrongGuesses.includes(guess)) {
                wrongGuesses.push(guess)
                if (wrongGuesses.length === 6) {
                  newEmbed.description = codeBlock(wrongs[wrongGuesses.length]);
                  const mongoClient = await connectToDB();
                  const collection = await connectToCollection('champion_info', mongoClient);
                  const champs = await collection.find<IChampionInfo>({}).toArray();
                  await mongoClient.close()
                  const found: IChampionInfo[] = fuzzySearch(champs, word, ['name']);
                  newEmbed.image = { url: `https://raw.githubusercontent.com/justuscook/rsl-assets/master/RSL-Assets/HeroAvatarsWithBorders/${found[0].id - 6}.png` }
                  newEmbed.addField('GAME OVER!', `💀🪢${message.author} you lost!💀🪢`)
                  collector.stop();
                  newEmbed.fields.find(x => x.name === 'Your word:').value = codeBlock(word);
                  //channelsInUse = channelsInUse.filter(x => x === message.channelId)

                  await gameBoard.edit({ embeds: [newEmbed] })
                  return true;
                }
              }
              newEmbed.description = codeBlock(wrongs[wrongGuesses.length]);
            }
            if (!wordFiltered.includes('_')) {
              collector.stop();
              //channelsInUse = channelsInUse.filter(x => x === message.channelId)
              const mongoClient = await connectToDB();
              const collection = await connectToCollection('champion_info', mongoClient);
              const champs = await collection.find<IChampionInfo>({}).toArray();
              await mongoClient.close()
              const found: IChampionInfo[] = fuzzySearch(champs, word, ['name']);
              const champImage = `https://raw.githubusercontent.com/justuscook/rsl-assets/master/RSL-Assets/HeroAvatarsWithBorders/${found[0].id - 6}.png`
              newEmbed.setImage(champImage);
              newEmbed.addField('GAME OVER!', `🎉💥${message.author} you won!🎉💥`);
              collector.stop();
              await gameBoard.edit({ embeds: [newEmbed] })
              //channelsInUse = channelsInUse.filter(x => x !== message.channelId);
              return true;
            }
            await gameBoard.edit({ embeds: [newEmbed] })
          }
          else {
            return;
          }
        })
        collector.on('end', async () => {
          const gameBoard = collector.message;
          const newEmbed = gameBoard.embeds[0].addField('🛑GAME STOPPED🛑', 'Thanks for playing,try again later!')          
            await gameBoard.edit({ embeds: [newEmbed] })
            //channelsInUse = channelsInUse.filter(x => x !== message.channelId);
            return true;
        })
      /*}
      else {
        await message.reply({
          allowedMentions: {
            repliedUser: false
          }, content: `${message.author} there is only one hangman allowed in a channel at a time!  Try again later.`
        });
        return true;
      }*/

    }
    catch (error) {
      console.log(error)
      return false
    }
  }
}


export default commandFile;

async function calcDifficulties() {
  const mongoClient = await connectToDB();
  const collection = await connectToCollection('champion_info', mongoClient);
  const champNames: IChampionInfo[] = await collection.find<IChampionInfo>({}).toArray();
  if (easy.length === 0) {
    const easyChamps = champNames.filter(x => x.name.length <= 5);
    easy = easyChamps.map(x => x.name);
    const brutalCHamps = champNames.filter(x => (x.name.length <= 10) && (x.name.length > 5));
    brutal = brutalCHamps.map(x => x.name);
    const nightmareChamps = champNames.filter(x => x.name.length > 10);
    nightmare = nightmareChamps.map(x => x.name);
  }
}

function getMatchedRegEx(guesses?: string[]): RegExp {
  if (guesses === undefined) {
    return new RegExp(`[a-z\u00C0-\u00FF]`, 'gi');
  }
  const regexText = guesses.join('|');
  let regex: RegExp = new RegExp(`(?!${regexText})[a-z\u00C0-\u00FF]`, 'gi');
  return regex;
}
const wrongs: string[] = [
  "ſ ̅ ̅ \n" +
  "|\n" +
  "|\n" +
  "|\n" +
  "|\n" +
  "⊥",
  "ſ ̅ ̅ O\n" +
  "|\n" +
  "|\n" +
  "|\n" +
  "|\n" +
  "⊥",
  "ſ ̅ ̅ O\n" +
  "|   |\n" +
  "|\n" +
  "|\n" +
  "|\n" +
  "⊥",
  "ſ ̅ ̅ O\n" +
  "|  -|\n" +
  "|\n" +
  "|\n" +
  "|\n" +
  "⊥",
  "ſ ̅ ̅ O\n" +
  "|  -|-\n" +
  "|   |\n" +
  "|\n" +
  "|\n" +
  "⊥",
  "ſ ̅ ̅ O\n" +
  "|  -|-\n" +
  "|   |\n" +
  "|  / \n" +
  "|\n" +
  "⊥",
  "ſ ̅ ̅ O\n" +
  "|  -|-\n" +
  "|   |\n" +
  "|  / \\\n" +
  "|\n" +
  "⊥"]

function emojiToLetter(emoji: string) {
  switch (emoji) {
    case '🇦':
      return 'a'
    case '🇧':
      return 'b'
    case '🇨':
      return 'c'
    case '🇩':
      return 'd'
    case '🇪':
      return 'e'
    case '🇫':
      return 'f'
    case '🇬':
      return 'g'
    case '🇭':
      return 'h'
    case '🇮':
      return 'i'
    case '🇯':
      return 'j'
    case '🇰':
      return 'k'
    case '🇱':
      return 'l'
    case '🇲':
      return 'm'
    case '🇳':
      return 'n'
    case '🇴':
      return 'o'
    case '🇵':
      return 'p'
    case '🇶':
      return 'q'
    case '🇷':
      return 'r'
    case '🇸':
      return 's'
    case '🇹':
      return 't'
    case '🇺':
      return 'u'
    case '🇻':
      return 'v'
    case '🇼':
      return 'w'
    case '🇽':
      return 'x'
    case '🇾':
      return 'y'
    case '🇿':
      return 'z'
    default:
      return 'none'

  }
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}