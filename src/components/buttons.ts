import { ButtonBuilder, ButtonInteraction, ButtonStyle, MessageFlags } from 'discord.js';
import { game, WordWolf } from '../WordWolf';

const flags = MessageFlags.Ephemeral;

const registration = {
  join: {
    component: new ButtonBuilder()
      .setCustomId('join')
      .setLabel('参加する')
      .setStyle(ButtonStyle.Primary),
    async execute(interaction: ButtonInteraction, wordWolf: WordWolf) {
      await interaction.deferUpdate();
    },
  },
};

type CustomId = keyof typeof registration;

export const button = Object.fromEntries(
  (Object.keys(registration) as CustomId[]).map((id) => [id, registration[id].component] as const),
) as { [key in CustomId]: ButtonBuilder };

export const buttonInteraction = async (interaction: ButtonInteraction) => {
  const ito = game.get(interaction);
  if (ito === null) {
    await interaction.reply({ content: '`/ito`しようね', flags });
    return;
  }
  const customId = interaction.customId as CustomId;
  await registration[customId].execute(interaction, ito);
};
