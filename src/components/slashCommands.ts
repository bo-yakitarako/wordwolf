import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  TextChannel,
} from 'discord.js';
import { game } from '../WordWolf';

const flags = MessageFlags.Ephemeral;

const registration = {
  wordwolf: {
    data: new SlashCommandBuilder().setName('wordwolf').setDescription('すんごいモフモフです'),
    execute: async (interaction: ChatInputCommandInteraction) => {
      game.create(interaction);
      await interaction.reply('ほええ');
    },
  },
};

type CommandName = keyof typeof registration;

export const commands = Object.values(registration).map(({ data }) => data.toJSON());
export const slashCommandsInteraction = async (interaction: ChatInputCommandInteraction) => {
  if (!(interaction.channel instanceof TextChannel)) {
    await interaction.reply({ content: 'ほ？', flags });
    return;
  }
  const commandName = interaction.commandName as CommandName;
  await registration[commandName].execute(interaction);
};
