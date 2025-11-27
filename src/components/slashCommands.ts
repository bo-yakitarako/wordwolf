import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  VoiceChannel,
} from 'discord.js';
import { game, WordWolf } from '../WordWolf';

const flags = MessageFlags.Ephemeral;

const registration = {
  wordwolf: {
    data: new SlashCommandBuilder().setName('wordwolf').setDescription('すんごいモフモフです'),
    execute: async (interaction: ChatInputCommandInteraction) => {
      const channel = interaction.channel as VoiceChannel;
      if (!channel.members.some((m) => m.user.id === interaction.user.id)) {
        await interaction.reply({ content: '接続せずにチャットだけ打つなんて姑息なやつめ', flags });
        return;
      }
      if (game.get(interaction) !== null) {
        await interaction.reply({ content: 'もういるよー', flags });
        return;
      }
      const wordWolf = game.create(interaction);
      await wordWolf.join(interaction);
    },
  },
  start: {
    data: new SlashCommandBuilder()
      .setName('start')
      .setDescription('議論時間を指定してスタートしちゃおう')
      .addIntegerOption((option) =>
        option.setName('時間').setDescription('時間は秒数で指定してな？').setRequired(true),
      ),
    execute: async (interaction: ChatInputCommandInteraction, wordWolf: WordWolf) => {
      const time = interaction.options.getInteger('時間', true);
      await wordWolf.start(interaction, time);
    },
  },
  result: {
    data: new SlashCommandBuilder().setName('result').setDescription('投票が終わった時にやるやつ'),
    execute: async (interaction: ChatInputCommandInteraction, wordWolf: WordWolf) => {
      await wordWolf.goToResult(interaction);
    },
  },
  continue: {
    data: new SlashCommandBuilder().setName('continue').setDescription('続けてえよな？'),
    execute: async (interaction: ChatInputCommandInteraction, wordWolf: WordWolf) => {
      await wordWolf.continue(interaction);
    },
  },
  finish: {
    data: new SlashCommandBuilder().setName('finish').setDescription('終わりてえよな？'),
    execute: async (interaction: ChatInputCommandInteraction, wordWolf: WordWolf) => {
      await wordWolf.finish(interaction);
    },
  },
  bye: {
    data: new SlashCommandBuilder().setName('bye').setDescription('ｻﾖﾅﾗしちゃう'),
    execute: async (interaction: ChatInputCommandInteraction, wordWolf: WordWolf) => {
      await wordWolf.destroy();
      game.remove(interaction);
      await interaction.reply('ばいばーい');
    },
  },
};

type CommandName = keyof typeof registration;

export const commands = Object.values(registration).map(({ data }) => data.toJSON());
export const slashCommandsInteraction = async (interaction: ChatInputCommandInteraction) => {
  if (!(interaction.channel instanceof VoiceChannel)) {
    await interaction.reply({ content: 'ほ？', flags });
    return;
  }
  const commandName = interaction.commandName as CommandName;
  const wordWolf = game.get(interaction);
  if (commandName !== 'wordwolf' && wordWolf === null) {
    await interaction.reply({ content: 'おらんがな', flags });
    return;
  }
  await registration[commandName].execute(interaction, wordWolf!);
};
