import {
  Message as DiscordMessage,
  OmitPartialGroupDMChannel,
  Interaction,
  ButtonInteraction,
  MessageFlags,
  ChatInputCommandInteraction,
} from 'discord.js';
import { buildEmbed, makeButtonRow } from './utils';
import { Theme } from './db/Theme';

const flags = MessageFlags.Ephemeral;
const manager: { [discordId in string]: string } = {};
const words: { [discordId in string]: [string, string] } = {};

type Message = OmitPartialGroupDMChannel<DiscordMessage<boolean>>;
export const isManager = (action: Interaction | Message) => {
  const user = 'user' in action ? action.user : action.author;
  return user.id in manager;
};

export const manageWordsInteraction = async (interaction: ChatInputCommandInteraction) => {
  const discordId = interaction.user.id;
  const guildId = interaction.guild!.id;
  manager[discordId] = guildId;
  const description = '2つのワードをスペースで区切って送信しよ';
  const embed = buildEmbed('2つのワードを送信してくだんせ', description, 'success');
  try {
    await interaction.user.send({ embeds: [embed] });
    await interaction.reply({ content: 'DMを送ったよ！確認してね', flags });
  } catch {
    delete manager[discordId];
    await interaction.reply({ content: 'DMを送れなかったよ...DMを許可してね', flags });
  }
};

export const receiveWord = async (message: Message) => {
  const discordId = message.author.id;
  if (discordId in words) {
    return;
  }
  const inputWords = message.content.split(/[\s　]+/);
  if (inputWords.length !== 2) {
    await message.reply('ワードは2個じゃないとわからんが？なんやお前');
    return;
  }
  words[discordId] = [inputWords[0], inputWords[1]];
  const buttonRow = makeButtonRow('manageYes', 'manageNo');
  await message.reply({
    content: `「${inputWords[0]}」と「${inputWords[1]}」でおけまる？`,
    components: [buttonRow],
  });
};

export const confirmButtonInteraction = async (interaction: ButtonInteraction, yes = true) => {
  const discordId = interaction.user.id;
  const guildId = manager[discordId] ?? null;
  if (!guildId) {
    await interaction.deferUpdate();
    return;
  }

  if (yes) {
    const userWords = words[discordId];
    if (userWords && guildId) {
      await Theme.create({ words: userWords, guildId, authorId: discordId } as Theme.Data);
    }
    const buttonRow = makeButtonRow('manageContinue', 'manageFinish');
    await interaction.reply({
      content: '追加したよ',
      components: [buttonRow],
    });
  } else {
    delete words[discordId];
    await interaction.reply('2つのワードをもっかい送信してくだんせ');
  }
};

export const manageFinishInteraction = async (interaction: ButtonInteraction, finish = true) => {
  const discordId = interaction.user.id;
  if (!(discordId in manager)) {
    await interaction.deferUpdate();
    return;
  }
  delete words[discordId];
  if (finish) {
    delete manager[discordId];
    await interaction.reply('じゃあまたね～');
  } else {
    await interaction.reply('2つのワードを送信してくだんせ');
  }
};
