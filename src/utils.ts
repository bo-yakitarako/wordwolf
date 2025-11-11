import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, EmbedField } from 'discord.js';
import { button } from './components/buttons';

export function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  let shuffledArray: T[] = [];
  while (copy.length > 0) {
    const index = Math.floor(Math.random() * copy.length);
    shuffledArray = [...shuffledArray, copy[index]];
    copy.splice(index, 1);
  }
  return shuffledArray;
}

type ButtonKey = keyof typeof button;
export const makeButtonRow = (...buttonKeys: ButtonKey[]) => {
  const buttons = buttonKeys.map((key) => button[key]);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
};

const colors = {
  info: 0xe8d44f,
  success: 0x53fc94,
  failure: 0xff5757,
};

type ColorKey = keyof typeof colors;
type DescriptionParams = [string] | [string, ColorKey];
type FieldsParams = [EmbedField[]] | [EmbedField[], ColorKey];
type AllParams = [string, EmbedField[]] | [string, EmbedField[], ColorKey];
export function buildEmbed(title: string, description: string): EmbedBuilder;
export function buildEmbed(title: string, description: string, color: ColorKey): EmbedBuilder;
export function buildEmbed(title: string, fields: EmbedField[]): EmbedBuilder;
export function buildEmbed(title: string, fields: EmbedField[], color: ColorKey): EmbedBuilder;
export function buildEmbed(title: string, description: string, fields: EmbedField[]): EmbedBuilder;
export function buildEmbed(
  title: string,
  description: string,
  fields: EmbedField[],
  color: ColorKey,
): EmbedBuilder;
export function buildEmbed(title: string, ...params: DescriptionParams | FieldsParams | AllParams) {
  let description = '';
  let fields: EmbedField[] = [];
  let color: ColorKey = 'info';
  if (params[0] instanceof Array) {
    fields = params[0];
    if (typeof params[1] === 'string') {
      color = params[1];
    }
  } else {
    description = params[0];
    if (params[1] instanceof Array) {
      fields = params[1];
      if (typeof params[2] === 'string') {
        color = params[2];
      }
    } else if (typeof params[1] === 'string') {
      color = params[1];
    }
  }
  const embed = new EmbedBuilder();
  embed.setTitle(title);
  embed.setColor(colors[color]);
  if (description) {
    embed.setDescription(description);
  }
  if (fields.length > 0) {
    embed.addFields(fields);
  }
  return embed;
}
