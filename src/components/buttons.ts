import { ButtonBuilder, ButtonInteraction, ButtonStyle, MessageFlags } from 'discord.js';
import { game, WordWolf } from '../WordWolf';
import { timeTitle } from '../utils';

const flags = MessageFlags.Ephemeral;

const registration = {
  start10: generateStartButton(10),
  start60: generateStartButton(60),
  start180: generateStartButton(180),
  start300: generateStartButton(300),
  start600: generateStartButton(600),
  word: {
    component: new ButtonBuilder()
      .setCustomId('word')
      .setLabel('ワードを確認')
      .setStyle(ButtonStyle.Primary),
    async execute(interaction: ButtonInteraction, wordWolf: WordWolf) {
      await wordWolf.checkWord(interaction);
    },
  },
  question: {
    component: new ButtonBuilder()
      .setCustomId('question')
      .setLabel('アンケートを取る')
      .setStyle(ButtonStyle.Secondary),
    async execute(interaction: ButtonInteraction, wordWolf: WordWolf) {
      await wordWolf.prepareQuestion(interaction);
    },
  },
  result: {
    component: new ButtonBuilder()
      .setCustomId('result')
      .setLabel('全員の投票が終わったらこれを押そうね')
      .setStyle(ButtonStyle.Primary),
    async execute(interaction: ButtonInteraction, wordWolf: WordWolf) {
      await wordWolf.goToResult(interaction);
    },
  },
  continue: {
    component: new ButtonBuilder()
      .setCustomId('continue')
      .setLabel('続ける')
      .setStyle(ButtonStyle.Primary),
    async execute(interaction: ButtonInteraction, wordWolf: WordWolf) {
      await wordWolf.continue(interaction);
    },
  },
  finish: {
    component: new ButtonBuilder()
      .setCustomId('finish')
      .setLabel('終わる')
      .setStyle(ButtonStyle.Secondary),
    async execute(interaction: ButtonInteraction, wordWolf: WordWolf) {
      await wordWolf.finish(interaction);
    },
  },
};

function generateStartButton(time: number) {
  return {
    component: new ButtonBuilder()
      .setCustomId(`start${time}`)
      .setLabel(timeTitle(time))
      .setStyle(ButtonStyle.Primary),
    async execute(interaction: ButtonInteraction, wordWolf: WordWolf) {
      await wordWolf.start(interaction, time);
    },
  };
}

type CustomId = keyof typeof registration;

export const button = Object.fromEntries(
  (Object.keys(registration) as CustomId[]).map((id) => [id, registration[id].component] as const),
) as { [key in CustomId]: ButtonBuilder };

export const buttonInteraction = async (interaction: ButtonInteraction) => {
  const wordWolf = game.get(interaction);
  if (wordWolf === null) {
    await interaction.reply({ content: '`/wordwolf`しようね', flags });
    return;
  }
  const customId = interaction.customId as CustomId;
  const [action, ...params] = customId.split('-');
  if (['answer', 'questionResult', 'vote'].includes(action)) {
    if (action === 'answer') {
      await wordWolf.answer(interaction, params[0], Number(params[1]));
    } else if (action === 'questionResult') {
      await wordWolf.showQuestionResult(interaction, params[0]);
    } else {
      await wordWolf.vote(interaction, params[0]);
    }
  } else {
    await registration[customId].execute(interaction, wordWolf);
  }
};
