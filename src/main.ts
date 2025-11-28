import { Client, GatewayIntentBits, Events, REST, Routes, MessageFlags } from 'discord.js';
import { config } from 'dotenv';
import { commands, slashCommandsInteraction } from './components/slashCommands';
import { buttonInteraction } from './components/buttons';
import { game } from './WordWolf';

config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, () => {
  console.log('一匹狼とか群れに馴染めないだけの言い訳だろ');
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await slashCommandsInteraction(interaction);
    }
    if (interaction.isButton()) {
      await buttonInteraction(interaction);
    }
  } catch (error) {
    console.log(error);
    if (interaction.isRepliable()) {
      const content = 'エラったァァァァァイヤァァァァ\n一旦もっかいやってみよ？';
      await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    const wordWolf = game.get(message);
    if (message.author.bot || wordWolf === null || !wordWolf.isQuestionReady(message)) {
      return;
    }
    await wordWolf.sendQuestion(message);
  } catch (error) {
    console.log(error);
  }
});

const TOKEN = process.env.TOKEN as string;
const CLIENT_ID = process.env.CLIENT_ID as string;
const GUILD_ID = process.env.GUILD_ID ?? null;
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    if (GUILD_ID !== null) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
        body: commands,
      });
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), {
        body: commands,
      });
    }
  } catch (error) {
    console.error(error);
  }
})();
client.login(TOKEN);
