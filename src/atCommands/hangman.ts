import { bold, codeBlock, userMention } from "@discordjs/builders";
import { CollectorFilter, Interaction, Message, MessageEmbed, MessageReaction, ReactionCollector, User } from "discord.js";
import { IShardData, msToTime } from "../general/IShardData";
import { clipText, connectToCollection, connectToDB, fuzzySearch, getInput, getTop, IChampionInfo, ICommandInfo, IGuide } from "../general/util";
import { topText } from '../arbi'
import { getRandomIntInclusive } from "./summon";

let easy: string[] = [];
let brutal: string[] = [];
let nightmare: string[] = [];
let words: string[] = [];
let channelsInUse: string[] = [];

const commandFile: ICommandInfo = {
  name: 'hangman',
  execute: async (message: Message, input?: string): Promise<boolean> => {
    try {
      if (!channelsInUse.includes(message.channelId)) {
        channelsInUse.push(message.channelId);
        await calcDifficulties();
        switch (input) {
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
        }
        const random = getRandomIntInclusive(1, words.length)
        const word = 'Big \'Un'//words[random - 1];
        const wordOnlyLetters = word.toLowerCase().replace(/[^\w]/g, '');
        let regex: RegExp = getMatchedRegEx();
        let wordFiltered = word.replace(regex, '_');
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
        const game = await message.channel.send({ embeds: [gameEmbed] })
        const collector = game.createReactionCollector({ filter, time: 15 * 60 * 1000 })
        collector.on('collect', async (reaction: MessageReaction, user: User) => {
          const guess = reaction.emoji.name.toLowerCase();
          if (!guesses.includes(guess)) {
            const gameBoard = reaction.message;            
            const newEmbed = gameBoard.embeds[0];            
            guesses.push(guess);
            regex = getMatchedRegEx(guesses);    
            wordFiltered = word.replace(regex, '_ ');
            newEmbed.fields[3].value = wordFiltered       
             
            await gameBoard.edit({ embeds: [newEmbed] })
          }
        })
        channelsInUse = channelsInUse.filter(x => x !== message.channelId);
      }
      else {

      }

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
  "⊥",
  "ſ ̅ ̅ O\n" +
  "|\n" +
  "|\n" +
  "⊥",
  "ſ ̅ ̅ O\n" +
  "|   |\n" +
  "|\n" +
  "⊥",
  "ſ ̅ ̅ O\n" +
  "|  -|\n" +
  "|\n" +
  "⊥",
  "ſ ̅ ̅ O\n" +
  "|  -|-\n" +
  "|   |\n" +
  "|\n" +
  "⊥",
  "ſ ̅ ̅ O\n" +
  "|  -|-\n" +
  "|   |\n" +
  "|  / \n" +
  "⊥",
  "ſ ̅ ̅ O\n" +
  "|  -|-\n" +
  "|   |\n" +
  "|  / \\\n" +
  "⊥"]

  async function emojiToLetter(emoji: string){
    switch(emoji){
      case '\U+0041'
    }
  }