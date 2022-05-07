using System;
using System.Collections.Generic;
using System.Text;
using Discord.Commands;
using Discord.Addons.InteractiveCommands;
using System.Threading.Tasks;
using System.IO;
using Discord;

namespace Unimate.Modules.Public.Hangman
{

    public class HangmanModule : InteractiveModuleBase
    {
        public class GameInfo
        {
            public string word { get; set; }
            public List<string> lettersGuessedWrong { get; set; }
            public List<string> lettersGuessedRight { get; set; }
			public int guessedTwice { get; set; }
            public int timesGuessed { get; set; }
            public int totalGuesses { get; set; }
            public string difficulty { get; set; }

            public GameInfo(string _word, string _diff, int _totalGuesses)
            {
                {
                    word = _word;
                    difficulty = _diff;
                    lettersGuessedWrong = new List<string>();
                    lettersGuessedRight = new List<string>();
					guessedTwice = 0;
                    timesGuessed = 0;
                    totalGuesses = _totalGuesses;

                }
            }
        }

        static string[] easyWords = File.ReadAllLines("easy.txt");
        List<string> easy = new List<string>(easyWords);

        static string[] mediumWords = File.ReadAllLines("medium.txt");
        List<string> medium = new List<string>(mediumWords);

        static string[] hardWords = File.ReadAllLines("hard.txt");
        List<string> hard = new List<string>(hardWords);
		

        public static string wrong0 =
            "ſ ̅ ̅ \n" +
            "|\n" +
            "|\n" +
            "⊥";
        public static string wrong1 =
            "ſ ̅ ̅ O\n" +
            "|\n" +
            "|\n" +
            "⊥";
        public static string wrong2 =
            "ſ ̅ ̅ O\n" +
            "|   |\n" +
            "|\n" +
            "⊥";

        public static string wrong3 =
           "ſ ̅ ̅ O\n" +
           "|  -|\n" +
           "|\n" +
           "⊥";
        public static string wrong4 =
           "ſ ̅ ̅ O\n" +
           "|  -|-\n" +
           "|\n" +
           "⊥";
        public static string wrong5 =
            "ſ ̅ ̅ O\n" +
            "|  -|-\n" +
            "|  / \n" +
            "⊥";
        public static string wrong6 =
            "ſ ̅ ̅ O\n" +
            "|  -|-\n" +
            "|  / \\\n" +
            "⊥";
        List<string> wrongs = new List<string>()
        { wrong0, wrong1, wrong2, wrong3, wrong4, wrong5, wrong6};

        [Command("Hangman", RunMode = RunMode.Async)]
        [Remarks("Play a game of hangman, 3 difficulty levels, start a game and see them.")]
        public async Task HangmanAsync(string diff = null)
        {
            try
            {
                diff = diff.ToLower();
            }
            catch { }
            Random rand = new Random();
            TimeSpan userTime = new TimeSpan(0, 0, 30);
            IUserMessage response = null;
            var game = new GameInfo(easy[rand.Next(easy.Count - 1)], "easy", 10);
            if (diff == null && diff != "hard" && diff != "easy" && diff != "medium")
            {
                await Context.Channel.SendMessageAsync($"`HELLO HUMAN PLAYER {Context.User.Username}...\n...LOADING HUMAN INTERACTION MODE...\n`\nLoad complete :smiley:\nHi, are you ready to play Hangman?  You can respond with 'quit' to stop the game after I ask for input.'\nPlease choose a difficulty level:\n" +
                    $"```Easy:   4-6 letter word and 10 chances to guess the word\n" +
                    $"Medium: 7-10 letter word and 10 chances to guess the word\n" +
                    $"Hard:   11+ letter word and 5 chances to guess the word```\n" +
                    $"Which do you choose?");
                response = await WaitForMessage(Context.Message.Author, Context.Channel, userTime, new MessageContainsResponsePrecondition("easy", "medium", "hard", "quit"));
                if (!CheckIfExists(response))
                {
                    await Context.Channel.SendMessageAsync($"{Context.User.Mention}, did you fall asleep, I'm ending the game sense you took to long to respond, thanks for trying?..");
                    return;
                }
                switch (response.Content.ToLower())
                {
                    case "easy":
                        break;
                    case "medium":
                        game = new GameInfo(medium[rand.Next(medium.Count - 1)], "medium", 10);
                        break;
                    case "hard":
                        game = new GameInfo(hard[rand.Next(hard.Count - 1)], "hard", 5);
                        break;
                    case "quit":
                        return;
                }
            }
            else
            {
                switch (diff)
                {
                    case "easy":
                        break;
                    case "medium":
                        game = new GameInfo(medium[rand.Next(medium.Count - 1)], "medium", 10);
                        break;
                    case "hard":
                        game = new GameInfo(hard[rand.Next(hard.Count - 1)], "hard", 5);
                        break;
                    case "quit":
                        return;
                }
            }

            //            await Context.Channel.SendMessageAsync($"Difficulty set to **{response.Content.ToUpper()}**");
            var embed = new EmbedBuilder();
            embed.AddField($"Difficulty:  **{game.difficulty.ToUpper()}**", $"```{wrong0}\n{MakeTheBlanks(game)}\nWrong guesses:\n```\nGuess a letter:", true);
            await Context.Channel.SendMessageAsync("", false, embed);
            response = await WaitForMessage(Context.Message.Author, Context.Channel, userTime);
            if (!CheckIfExists(response))
            {
                await Context.Channel.SendMessageAsync($"{Context.User.Mention}, did you fall asleep, I'm ending the game sense you took to long to respond, thanks for trying?..");
                return;
            }
            string guess = "";
            while ((response.Content.ToLower() != game.word && !GuessedAllLetters(game)) && (game.timesGuessed != game.totalGuesses) && (response.Content.ToLower() != "quit") && (game.lettersGuessedWrong.Count < 6))
            {
                if (!CheckIfExists(response))
                {
                    await Context.Channel.SendMessageAsync($"{Context.User.Mention}, did you fall asleep, I'm ending the game sense you took to long to respond, thanks for trying?..");
                    return;
                }
                guess = response.Content.ToString().ToLower();
                if (response.Content.Length == 1)
                {
					embed = new EmbedBuilder();
					//if(response.Content.Contains(goodGuess.ForEach())))
					foreach (var c in response.Content)
					{
						if(game.lettersGuessedRight.Contains(c.ToString()))
						{
							embed.AddField(":-1:",$"You have alrady guessed **{c}**, tisk, tisk.  That will count against you.");
							game.guessedTwice += 1;
							embed.AddField($"Difficulty:  **{game.difficulty.ToUpper()}**", $"```{wrongs[game.lettersGuessedWrong.Count + game.guessedTwice]}\n{MakeTheBlanks(game)}\nWrong guesses:\n{WrongGuesses(game)}```\nGuess a letter:\n", true);
							await Context.Channel.SendMessageAsync("", false, embed);
							response = await WaitForMessage(Context.Message.Author, Context.Channel, userTime);
							if (!CheckIfExists(response))
							{
								await Context.Channel.SendMessageAsync($"{Context.User.Mention}, did you fall asleep, I'm ending the game sense you took to long to respond, thanks for trying?..");
								return;
							}
							if(game.lettersGuessedWrong.Count + game.guessedTwice == 5)
							{
								game.guessedTwice += 1;
								await Context.Channel.SendMessageAsync($"{Context.User.Mention}, you guessed to many times,\n```{wrongs[game.lettersGuessedWrong.Count + game.guessedTwice]}```\nYour dead **R.I.P** :dizzy_face:");
								return;
							}
						}
					}
                    

                    if (CorrectGuess(game, guess) && !game.lettersGuessedRight.Contains(guess))
                    {
                        game.lettersGuessedRight.Add(guess);
                        if (GuessedAllLetters(game))
                        {
                            await Context.Channel.SendMessageAsync($"Congratz {Context.User.Mention}, you won :tada: your word was **{game.word.ToUpper()}**");
                            return;
                        }
                        else
                        {
                            embed.AddField(":+1:", "Good guess!");
                            embed.AddField($"Difficulty:  **{game.difficulty.ToUpper()}**", $"```{wrongs[game.lettersGuessedWrong.Count + game.guessedTwice]}\n{MakeTheBlanks(game)}\nWrong guesses:\n{WrongGuesses(game)}```\nGuess a letter:\n", true);
                            await Context.Channel.SendMessageAsync("", false, embed);
                            response = await WaitForMessage(Context.Message.Author, Context.Channel, userTime);
                            if (!CheckIfExists(response))
                            {
                                await Context.Channel.SendMessageAsync($"{Context.User.Mention}, did you fall asleep, I'm ending the game sense you took to long to respond, thanks for trying?..");
                                return;
                            }
                            continue;
                        }
                    }
                    else
                    {
						if (game.lettersGuessedRight.Contains(guess)) continue;
                        game.lettersGuessedWrong.Add(guess);
                        if (game.timesGuessed == game.totalGuesses || game.lettersGuessedWrong.Count == 6) break;
                        embed.AddField(":-1:", "That letter guess is incorrect :frowning2:\nGuess a letter or try again:");
                        embed.AddField($"Difficulty:  **{game.difficulty.ToUpper()}**", $"```{wrongs[game.lettersGuessedWrong.Count + game.guessedTwice]}\n{MakeTheBlanks(game)}\nWrong guesses:\n{WrongGuesses(game)}```\nGuess a letter:\n", true);
                        await Context.Channel.SendMessageAsync("", false, embed);
                        response = await WaitForMessage(Context.Message.Author, Context.Channel, userTime);
                        if (!CheckIfExists(response))
                        {
                            await Context.Channel.SendMessageAsync($"{Context.User.Mention}, did you fall asleep, I'm ending the game sense you took to long to respond, thanks for trying?..");
                            return;
                        }

                        continue;
                    }
                }
                else
                {
                    game.timesGuessed += 1;
                    if (game.timesGuessed == game.totalGuesses || game.lettersGuessedWrong.Count == 6) break;
                    embed.AddField(":-1:", "That word guess is incorrect :frowning2:\nGuess a letter or try again:", true);
                    embed.AddField($"Difficulty:  **{game.difficulty.ToUpper()}**", $"```{wrongs[game.lettersGuessedWrong.Count + game.guessedTwice]}\n{MakeTheBlanks(game)}\nWrong guesses:\n{WrongGuesses(game)}```\nGuess a letter:\n", true);
                    response = await WaitForMessage(Context.Message.Author, Context.Channel, userTime);
                    if (!CheckIfExists(response))
                    {
                        await Context.Channel.SendMessageAsync($"{Context.User.Mention}, did you fall asleep, I'm ending the game sense you took to long to respond, thanks for trying?..");
                        return;
                    }
                    continue;
                }
            }            
            if (response.Content.ToLower() == "quit") await Context.Channel.SendMessageAsync($"{Context.User.Mention}, uhhm, thanks for trying?..");
            else if (GuessedAllLetters(game)) await Context.Channel.SendMessageAsync($"Congratz {Context.User.Mention}, you won :tada: your word was **{game.word.ToUpper()}**");
            else await Context.Channel.SendMessageAsync($"{Context.User.Mention}, you guessed to many times,\n```{wrongs[game.lettersGuessedWrong.Count]}```\nYour dead **R.I.P** :dizzy_face:");
            if (!CheckIfExists(response)) await Context.Channel.SendMessageAsync($"{Context.User.Mention}, did you fall asleep, I'm ending the game sense you took to long to respond, thanks for trying?..");

        }
        public bool GuessedAllLetters(GameInfo game)
        {
            foreach (var l in game.word)
            {
                if (game.lettersGuessedRight != null)
                {
                    if (game.lettersGuessedRight.Contains(l.ToString())) continue;
                    else return false;
                }
                else return false;
            }
            return true;
        }
        public bool CorrectGuess(GameInfo game, string l)
        {
            if (game.word.Contains(l)) return true;
            else return false;
        }

        public string MakeTheBlanks(GameInfo game)
        {
            string blanks = "";

            foreach (var l in game.word)
            {
                if (game.lettersGuessedRight.Contains(l.ToString()))
                {
                    blanks += $"{l} ";
                }
                else blanks += "_ ";
            }
            return blanks;
        }
        public string WrongGuesses(GameInfo game)
        {
            string wrong = "";
            if (game.lettersGuessedWrong != null)
            {
                foreach (var l in game.lettersGuessedWrong)
                {
                    wrong += $"{l} ";
                }
            }
            return wrong;
        }

        public bool CheckIfExists(IUserMessage message)
        {
            try
            {
                ulong x = message.Id;
                return true;
            }
            catch
            {
                return false;
            }
        }

    }
}