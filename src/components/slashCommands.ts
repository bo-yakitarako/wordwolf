import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  VoiceChannel,
} from 'discord.js';
import { game } from '../WordWolf';

const flags = MessageFlags.Ephemeral;

const registration = {
  wordwolf: {
    data: new SlashCommandBuilder().setName('wordwolf').setDescription('すんごいモフモフです'),
    execute: async (interaction: ChatInputCommandInteraction) => {
      if (game.get(interaction) !== null) {
        await interaction.reply({ content: 'もういるよー', flags });
        return;
      }
      const wordWolf = game.create(interaction);
      await wordWolf.join(interaction);
    },
  },
  result: {
    data: new SlashCommandBuilder().setName('result').setDescription('投票が終わった時にやるやつ'),
    execute: async (interaction: ChatInputCommandInteraction) => {
      const wordWolf = game.get(interaction);
      if (wordWolf === null) {
        await interaction.reply({ content: 'おらんがな', flags });
        return;
      }
      await wordWolf.goToResult(interaction);
    },
  },
  continue: {
    data: new SlashCommandBuilder().setName('continue').setDescription('続けてえよな？'),
    execute: async (interaction: ChatInputCommandInteraction) => {
      const wordWolf = game.get(interaction);
      if (wordWolf === null) {
        await interaction.reply({ content: 'おらんがな', flags });
        return;
      }
      await wordWolf.continue(interaction);
    },
  },
  finish: {
    data: new SlashCommandBuilder().setName('finish').setDescription('終わりてえよな？'),
    execute: async (interaction: ChatInputCommandInteraction) => {
      const wordWolf = game.get(interaction);
      if (wordWolf === null) {
        await interaction.reply({ content: 'おらんがな', flags });
        return;
      }
      await wordWolf.finish(interaction);
    },
  },
  bye: {
    data: new SlashCommandBuilder().setName('bye').setDescription('ｻﾖﾅﾗしちゃう'),
    execute: async (interaction: ChatInputCommandInteraction) => {
      const wordWolf = game.get(interaction);
      if (wordWolf === null) {
        await interaction.reply({ content: 'おらんがな', flags });
        return;
      }
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
  await registration[commandName].execute(interaction);
};
