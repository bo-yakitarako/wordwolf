import { Interaction, MessageFlags, RepliableInteraction } from 'discord.js';

const guilds: { [guildId in string]: WordWolf } = {};
export const game = {
  get({ guildId }: Interaction) {
    if (guildId === null) {
      return null;
    }
    return guilds[guildId] ?? null;
  },
  create({ guildId }: RepliableInteraction) {
    if (guildId === null) {
      return null;
    }
    guilds[guildId] = new WordWolf();
    return guilds[guildId];
  },
  remove({ guildId }: Interaction) {
    if (guildId === null) {
      return;
    }
    delete guilds[guildId];
  },
};

const flags = MessageFlags.Ephemeral;

export class WordWolf {}
