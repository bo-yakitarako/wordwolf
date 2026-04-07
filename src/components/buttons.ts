import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { game, WordWolf } from '../WordWolf';
import { timeTitle } from '../utils';
import { manageFinishInteraction, confirmButtonInteraction } from '../wordsManagement';

const flags = MessageFlags.Ephemeral;

const registration = {
  start: {
    component: (time: number) =>
      new ButtonBuilder()
        .setCustomId(`start-${time}`)
        .setLabel(timeTitle(time))
        .setStyle(ButtonStyle.Primary),
    async execute(interaction: ButtonInteraction, wordWolf: WordWolf, time: string) {
      await wordWolf.start(interaction, Number(time));
    },
  },
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
  answer: {
    component: (id: string, index: number, label: string) =>
      new ButtonBuilder()
        .setCustomId(`answer-${id}-${index}`)
        .setLabel(label)
        .setStyle(ButtonStyle.Primary),
    async execute(interaction: ButtonInteraction, wordWolf: WordWolf, id: string, index: string) {
      await wordWolf.answer(interaction, id, Number(index));
    },
  },
  questionResult: {
    component: (id: string) =>
      new ButtonBuilder()
        .setCustomId(`questionResult-${id}`)
        .setLabel('アンケート結果を見る')
        .setStyle(ButtonStyle.Primary),
    async execute(interaction: ButtonInteraction, wordWolf: WordWolf, id: string) {
      await wordWolf.showQuestionResult(interaction, id);
    },
  },
  vote: {
    component: (id: string, name: string) =>
      new ButtonBuilder().setCustomId(`vote-${id}`).setLabel(name).setStyle(ButtonStyle.Primary),
    async execute(interaction: ButtonInteraction, wordWolf: WordWolf, id: string) {
      await wordWolf.vote(interaction, id);
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
  manageYes: {
    component: new ButtonBuilder()
      .setCustomId('manageYes')
      .setLabel('はい')
      .setStyle(ButtonStyle.Primary),
    async execute(interaction: ButtonInteraction) {
      await confirmButtonInteraction(interaction, true);
    },
  },
  manageNo: {
    component: new ButtonBuilder()
      .setCustomId('manageNo')
      .setLabel('やり直す')
      .setStyle(ButtonStyle.Secondary),
    async execute(interaction: ButtonInteraction) {
      await confirmButtonInteraction(interaction, false);
    },
  },
  manageContinue: {
    component: new ButtonBuilder()
      .setCustomId('manageContinue')
      .setLabel('更にワードを追加する')
      .setStyle(ButtonStyle.Primary),
    async execute(interaction: ButtonInteraction) {
      await manageFinishInteraction(interaction, false);
    },
  },
  manageFinish: {
    component: new ButtonBuilder()
      .setCustomId('manageFinish')
      .setLabel('終わる')
      .setStyle(ButtonStyle.Secondary),
    async execute(interaction: ButtonInteraction) {
      await manageFinishInteraction(interaction, true);
    },
  },
};

type Registration = typeof registration;
type ButtonKey = keyof Registration;
type AnyExecute = (
  interaction: ButtonInteraction,
  wordWolf: WordWolf,
  ...args: string[]
) => Promise<void>;

export const buttonInteraction = async (interaction: ButtonInteraction) => {
  const wordWolf = game.get(interaction);
  if (wordWolf === null) {
    await interaction.reply({ content: '`/wordwolf`しようね', flags });
    return;
  }
  const [customId, ...params] = interaction.customId.split('-');
  await (registration[customId as ButtonKey].execute as AnyExecute)(
    interaction,
    wordWolf,
    ...params,
  );
};

type ButtonComponentBuilder<T extends ButtonKey> = Registration[T]['component'] extends (
  ...args: infer P
) => ButtonBuilder
  ? [T, ...P]
  : [T];
export type ButtonInfoArg = {
  [K in ButtonKey]: Registration[K]['component'] extends (...args: infer _P) => ButtonBuilder
    ? ButtonComponentBuilder<K>
    : K | ButtonComponentBuilder<K>;
}[ButtonKey];

export function makeButtonRow(...buttonInfos: ButtonInfoArg[]) {
  const buttons = buttonInfos.map((info) => {
    const [key, ...args] = Array.isArray(info) ? info : [info];
    const component = registration[key as ButtonKey].component;
    if (typeof component === 'function') {
      return (component as (...args: unknown[]) => ButtonBuilder)(...args);
    }
    return component;
  });
  return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
}
