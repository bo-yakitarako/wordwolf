import {
  EmbedBuilder,
  EmbedField,
  GuildMember,
  RepliableInteraction,
  EmbedAuthorOptions as Author,
} from 'discord.js';

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

type NameArrange = (name: string) => string;
export const memberInfo = ({ member, user }: RepliableInteraction, nameArrange?: NameArrange) => {
  if (member instanceof GuildMember) {
    const name = nameArrange ? nameArrange(member.displayName) : member.displayName;
    return { name, iconURL: member.displayAvatarURL() };
  }
  const name = nameArrange ? nameArrange(user.username) : user.username;
  return { name, iconURL: user.displayAvatarURL() };
};

const colors = {
  info: 0xe8d44f,
  primary: 0x3b93ff,
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
export function buildEmbed(author: Author, description: string): EmbedBuilder;
export function buildEmbed(author: Author, description: string, color: ColorKey): EmbedBuilder;
export function buildEmbed(author: Author, description: string, fields: EmbedField[]): EmbedBuilder;
export function buildEmbed(
  author: Author,
  description: string,
  fields: EmbedField[],
  color: ColorKey,
): EmbedBuilder;
export function buildEmbed(author: Author, description: string, fields: EmbedField[]): EmbedBuilder;
export function buildEmbed(
  author: Author,
  description: string,
  fields: EmbedField[],
  color: ColorKey,
): EmbedBuilder;
export function buildEmbed(
  title: string | Author,
  ...params: DescriptionParams | FieldsParams | AllParams
) {
  let description = '';
  let fields: EmbedField[] = [];
  let color: ColorKey = 'primary';
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
  if (typeof title === 'string') {
    embed.setTitle(title);
  } else {
    embed.setAuthor(title);
  }
  embed.setColor(colors[color]);
  if (description) {
    embed.setDescription(description);
  }
  if (fields.length > 0) {
    embed.addFields(fields);
  }
  return embed;
}

export function timeTitle(time: number) {
  return time < 60 ? `${time}秒` : `${Math.floor(time / 60)}分`;
}

export function timeText(time: number) {
  const minute = `${Math.floor(time / 60)}`.padStart(2, '0');
  const second = (time % 60).toString().padStart(2, '0');
  return `${minute}:${second}`;
}

export function buildTimeEmbed(time: number) {
  return buildEmbed('残り時間', timeText(time), 'success');
}
