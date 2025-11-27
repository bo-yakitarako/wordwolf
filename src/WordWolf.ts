import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import {
  ButtonInteraction,
  Interaction,
  MessageFlags,
  OmitPartialGroupDMChannel,
  RepliableInteraction,
  VoiceChannel,
  Message as DiscordMessage,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import * as path from 'path';
import { buildEmbed, buildTimeEmbed, makeButtonRow, shuffle } from './utils';
import { Theme } from './db/Theme';

type Message = OmitPartialGroupDMChannel<DiscordMessage<boolean>>;

const guilds: { [guildId in string]: WordWolf } = {};
export const game = {
  get({ guildId }: Interaction | Message): WordWolf | null {
    return guilds[guildId!] ?? null;
  },
  create(interaction: RepliableInteraction) {
    guilds[interaction.guildId!] = new WordWolf(interaction);
    return guilds[interaction.guildId!];
  },
  remove({ guildId }: Interaction | Message) {
    delete guilds[guildId!];
  },
};

const flags = MessageFlags.Ephemeral;
export const answerLabels = ['はい', 'いいえ', 'どちらともいえない'];

export class WordWolf {
  private parentId: string;
  private channel: VoiceChannel;
  private connection: VoiceConnection;
  private player: AudioPlayer;
  private status: 'beforeDebating' | 'debating' | 'voting' | 'result' = 'beforeDebating';
  private memberIds: string[] = [];
  private winningCount: { [discordId in string]: number } = {};
  private themes: [string, string][] = [];
  private themeIndex = 0;
  private wolfWordIndex = 0;
  private memberWordIndex: { [discordId in string]: number } = {}; // number is 0 or 1 (index)
  private questionAcceptedIds: string[] = [];
  private quesions: { [discordId in string]: string } = {};
  private questionMessages: Message[] = [];
  private answers: { [discordId in string]: { [discordId in string]: number } } = {};
  private votes: { [discordId in string]: string } = {};
  private voteMessage: Message | null = null;

  public constructor(interaction: RepliableInteraction) {
    this.parentId = interaction.user.id;
    this.channel = interaction.channel as VoiceChannel;
    this.connection = joinVoiceChannel({
      channelId: this.channel.id,
      guildId: this.channel.guildId,
      adapterCreator: this.channel.guild.voiceAdapterCreator,
    });
    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });
    this.connection.subscribe(this.player);
  }

  public async join(interaction: RepliableInteraction) {
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (this.connection.state.status === VoiceConnectionStatus.Ready) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      this.connection.once(VoiceConnectionStatus.Ready, () => {
        clearInterval(interval);
        resolve();
      });
    });
    await this.fetchThemes();
    const components = [makeButtonRow('start10', 'start60', 'start180', 'start300', 'start600')];
    interaction.reply({ content: '議論時間を選んでスタートしちゃお', components, flags });
    this.channel.send('ワードウルフに参加したくない人はミュートにしておいてください');
    await this.talk('join');
  }

  private async fetchThemes() {
    const themes = await Theme.findMany({
      guildId: { $in: [null, this.channel.guildId] },
    });
    this.themes = shuffle(themes.map((theme) => theme.words));
  }

  public async destroy() {
    await this.toggleMute(false);
    this.player.stop();
    this.connection.destroy();
  }

  public async start(interaction: RepliableInteraction, time: number) {
    if (interaction.user.id !== this.parentId) {
      await interaction.reply({ content: 'おめえにその権利ねえから！', flags });
      return;
    }
    if (this.status !== 'beforeDebating') {
      await interaction.reply({ content: '今やっとるやんけ', flags });
      return;
    }
    const ids = this.channel.members
      .filter((m) => !m.user.bot && !m.voice.selfMute)
      .map((m) => m.user.id);
    if (ids.length > 8) {
      const content = '8人までで頼むよー誰かミュートしてー';
      if (interaction.isButton()) {
        await interaction.deferUpdate();
        this.channel.send(content);
      } else {
        interaction.reply(content);
      }
      await this.talk('over');
      return;
    }
    if (ids.length < 3) {
      const content = 'せめて3人は必要なんじゃない？';
      if (interaction.isButton()) {
        await interaction.deferUpdate();
        this.channel.send(content);
      } else {
        interaction.reply(content);
      }
      await this.talk('under');
      return;
    }
    this.memberIds = [...ids];
    await this.toggleMute(false);
    this.wolfWordIndex = Math.floor(2 * Math.random());
    const generalWordIndex = this.wolfWordIndex === 0 ? 1 : 0;
    const wolfPlayerIndex = Math.floor(ids.length * Math.random());
    ids.forEach((id, index) => {
      this.memberWordIndex[id] = index === wolfPlayerIndex ? this.wolfWordIndex : generalWordIndex;
    });
    await this.debate(interaction, time);
  }

  private async debate(interaction: RepliableInteraction, time: number) {
    this.status = 'debating';
    this.questionAcceptedIds = [];
    this.quesions = {};
    this.questionMessages = [];
    this.answers = {};
    this.votes = {};
    const components = [makeButtonRow('word', 'question')];
    await interaction.reply({ components, embeds: [buildTimeEmbed(time)] });
    this.talk('start');
    let remainingTime = time;
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        remainingTime -= 1;
        interaction.editReply({ components, embeds: [buildTimeEmbed(remainingTime)] });
        if ([10, 30, 60, 120, 180, 300].includes(remainingTime)) {
          this.talk(`${remainingTime}`);
        }
        if (remainingTime <= 0) {
          this.talk('debateFinish');
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });
    await this.readyToVoting(interaction);
  }

  public async checkWord(interaction: ButtonInteraction) {
    const wordIndex: number | null = this.memberWordIndex[interaction.user.id] ?? null;
    if (wordIndex === null) {
      const description = Object.entries(this.memberWordIndex)
        .map(([id, index]) => {
          const isWolf = index === this.wolfWordIndex;
          const result = `${isWolf ? ':wolf:' : ':man:'} ${this.name(id)}: ${this.themes[this.themeIndex][index]}`;
          return isWolf ? `**${result}**` : result;
        })
        .join('\n');
      await interaction.reply({ embeds: [buildEmbed('みんなのワード一覧', description)], flags });
      return;
    }
    const title = `${this.name(interaction)}くんのワード`;
    const word = this.themes[this.themeIndex][wordIndex];
    await interaction.reply({ embeds: [buildEmbed(title, word)], flags });
  }

  public async prepareQuestion(interaction: ButtonInteraction) {
    if (!this.memberIds.includes(interaction.user.id)) {
      await interaction.reply({ content: 'どちら様でございますか？', flags });
      return;
    }
    if (this.status !== 'debating') {
      await interaction.reply({ content: '当たり前だけど議論タイムじゃないと無理よ？', flags });
      return;
    }
    if (interaction.user.id in this.quesions) {
      await interaction.reply({ content: '質問できるのは1回までだよ', flags });
      return;
    }
    if (this.questionAcceptedIds.includes(interaction.user.id)) {
      await interaction.reply({ content: 'もう受け付けてンだわ。質問打ち込もうね', flags });
      return;
    }
    this.questionAcceptedIds = [...this.questionAcceptedIds, interaction.user.id];
    await interaction.reply({ content: 'このチャットに質問を打ち込んでみんなに共有しよう', flags });
  }

  public isQuestionReady(action: Interaction | Message) {
    const user = 'user' in action ? action.user : action.author;
    return (
      action.channelId === this.channel.id &&
      this.status === 'debating' &&
      this.questionAcceptedIds.includes(user.id) &&
      !(user.id in this.quesions)
    );
  }

  public async sendQuestion(message: Message) {
    const id = message.author.id;
    this.quesions[message.author.id] = message.content;
    const answerButtons = [0, 1, 2].map((answerIndex) =>
      new ButtonBuilder()
        .setCustomId(`answer-${id}-${answerIndex}`)
        .setLabel(answerLabels[answerIndex])
        .setStyle(ButtonStyle.Primary),
    );
    const answerComponents = new ActionRowBuilder<ButtonBuilder>().addComponents(answerButtons);
    const resultButton = new ButtonBuilder()
      .setCustomId(`questionResult-${id}`)
      .setLabel('回答結果を表示')
      .setStyle(ButtonStyle.Primary);
    const resultComponents = new ActionRowBuilder<ButtonBuilder>().addComponents(resultButton);
    const qMessage = await message.reply({ components: [answerComponents, resultComponents] });
    this.questionMessages = [...this.questionMessages, qMessage];
  }

  public async answer(interaction: ButtonInteraction, authorId: string, answerIndex: number) {
    if (!this.memberIds.includes(interaction.user.id)) {
      await interaction.reply({ content: 'あんただれー？', flags });
      return;
    }
    if (!(authorId in this.answers)) {
      this.answers[authorId] = {};
    }
    this.answers[authorId][interaction.user.id] = answerIndex;
    const content = `「${answerLabels[answerIndex]}」で回答したよ`;
    await interaction.reply({ content, flags });
  }

  public async showQuestionResult(interaction: ButtonInteraction, authorId: string) {
    if (!(authorId in this.answers)) {
      await interaction.reply({ content: '誰も回答してねえぞコラ', flags });
      return;
    }
    if (
      !(interaction.user.id in this.answers[authorId]) &&
      this.memberIds.includes(interaction.user.id)
    ) {
      await interaction.reply({ content: '回答しないと見れないからね？', flags });
      return;
    }
    await interaction.reply({ embeds: [this.buildQuestionResultEmbed(authorId)], flags });
  }

  private buildQuestionResultEmbed(authorId: string) {
    const title = `${this.name(authorId)}くんの質問の結果`;
    const answerTexts = this.memberIds.map((id) => {
      if (!(id in this.answers[authorId])) {
        return `${this.name(id)}くん: 未回答`;
      }
      return `${this.name(id)}くん: ${answerLabels[this.answers[authorId][id]]}`;
    });
    const resultField = { name: 'みんなの回答', value: answerTexts.join('\n'), inline: false };
    return buildEmbed(title, this.quesions[authorId], [resultField]);
  }

  private async readyToVoting(interaction: RepliableInteraction) {
    this.status = 'voting';
    await this.toggleMute(true);
    this.questionMessages = await Promise.all(
      this.questionMessages.map((message) =>
        message.edit({ components: message.components.slice(1) }),
      ),
    );
    await interaction.deleteReply();
    const buttons = this.memberIds.map((id) =>
      new ButtonBuilder()
        .setCustomId(`vote-${id}`)
        .setLabel(this.name(id))
        .setStyle(ButtonStyle.Primary),
    );
    const components = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(buttons),
      makeButtonRow('word'),
    ];
    this.voteMessage = await this.channel.send({ content: '人狼だーれだ？', components });
  }

  public async vote(interaction: ButtonInteraction, targetId: string) {
    if (!this.memberIds.includes(interaction.user.id)) {
      await interaction.reply({ content: '外野はだまっとれ', flags });
      return;
    }
    this.votes[interaction.user.id] = targetId;
    const content = `${this.name(targetId)}くんに投票したよ`;
    const components = interaction.user.id === this.parentId ? [makeButtonRow('result')] : [];
    await interaction.reply({ content, components, flags });
  }

  public async goToResult(interaction: RepliableInteraction) {
    if (interaction.user.id !== this.parentId) {
      await interaction.reply({ content: 'おめえにその権利ねえから！', flags });
      return;
    }
    if (this.status !== 'voting') {
      await interaction.reply({ content: '変なときに結果見ようとしてんじゃないよ', flags });
      return;
    }
    const unvotedIds = this.memberIds.filter((id) => !Object.keys(this.votes).includes(id));
    if (unvotedIds.length > 0) {
      const names = unvotedIds.map((id) => `${this.name(id)}くん`).join('と');
      await interaction.reply({ content: `${names}が投票まだだよ`, flags });
      return;
    }
    this.status = 'result';
    this.toggleMute(false);
    this.voteMessage?.delete();
    this.talk('result');
    Promise.all(this.questionMessages.map((m) => m.delete()));
    const qEmbeds = Object.keys(this.quesions).map((id) => this.buildQuestionResultEmbed(id));
    const embeds = [...qEmbeds, this.buildResultEmbed()];
    this.themeIndex += 1;
    if (interaction.isButton()) {
      const components =
        this.themeIndex >= this.themes.length
          ? [makeButtonRow('finish')]
          : [makeButtonRow('continue', 'finish')];
      await this.channel.send({ embeds });
      await interaction.reply({ components, flags });
    } else {
      await interaction.reply({ embeds });
    }
  }

  private buildResultEmbed() {
    const voteResult = Object.fromEntries(this.memberIds.map((id) => [id, 0]));
    for (const voteId of Object.values(this.votes)) {
      voteResult[voteId] += 1;
    }
    const voteCounts = Object.values(voteResult);
    const maxVote = Math.max(...voteCounts);
    let isWolfWin = voteCounts.filter((count) => count === maxVote).length > 1;
    if (!isWolfWin) {
      for (const [discordId, count] of Object.entries(voteResult)) {
        if (count === maxVote) {
          isWolfWin = this.memberWordIndex[discordId] !== this.wolfWordIndex;
          break;
        }
      }
    }
    this.addWinningCount(isWolfWin);
    const title = 'けっかはっぴょぉぉぉぉぉ';
    const description = `**${isWolfWin ? '人狼' : '市民'}**の勝ち！`;
    const counts = Object.entries(voteResult).map(([id, count]) => {
      const isWolf = this.memberWordIndex[id] === this.wolfWordIndex;
      const word = this.themes[this.themeIndex][this.memberWordIndex[id]];
      const result = `${isWolf ? ':wolf:' : ':man:'} ${this.name(id)}【${word}】: ${count}`;
      return isWolf ? `**${result}**` : result;
    });
    const countField = { name: '得票数', value: counts.join('\n'), inline: false };
    return buildEmbed(title, description, [countField], isWolfWin ? 'failure' : 'success');
  }

  private addWinningCount(isWolfWin: boolean) {
    const generalWordIndex = this.wolfWordIndex === 0 ? 1 : 0;
    const winningIndex = isWolfWin ? this.wolfWordIndex : generalWordIndex;
    for (const id of this.memberIds) {
      if (!(id in this.winningCount)) {
        this.winningCount[id] = 0;
      }
      if (this.memberWordIndex[id] === winningIndex) {
        this.winningCount[id] += 1;
      }
    }
  }

  public async continue(interaction: RepliableInteraction) {
    if (interaction.user.id !== this.parentId) {
      await interaction.reply({ content: 'おめえにその権利ねえから！', flags });
      return;
    }
    if (this.status !== 'result') {
      await interaction.reply({ content: '今はそのときじゃないねえ', flags });
      return;
    }
    if (this.themeIndex >= this.themes.length) {
      await interaction.reply({ content: 'もうお題尽きちゃった', flags });
      return;
    }
    this.status = 'beforeDebating';
    const components = [makeButtonRow('start10', 'start60', 'start180', 'start300', 'start600')];
    await interaction.reply({ components, flags });
  }

  public async finish(interaction: RepliableInteraction) {
    if (interaction.user.id !== this.parentId) {
      await interaction.reply({ content: 'おめえにその権利ねえから！', flags });
      return;
    }
    if (this.status !== 'result') {
      await interaction.reply({ content: '今はそのときじゃないねえ', flags });
      return;
    }
    const content = 'ばいばーい';
    const description = Object.entries(this.winningCount)
      .sort((a, b) => b[1] - a[1])
      .map(([id, count], index) => `${index + 1}. ${this.name(id)}くん: ${count}`)
      .join('\n');
    const embeds = [buildEmbed('みんなの勝利数', description, 'success')];
    if (interaction.isButton()) {
      await interaction.deferUpdate();
      await this.channel.send({ content, embeds });
    } else {
      await interaction.reply({ content, embeds });
    }
    await this.destroy();
    game.remove(interaction);
  }

  private async talk(fileName: string) {
    await entersState(this.player, AudioPlayerStatus.Idle, 2 ** 31 - 1);
    const voicePath = path.join(process.cwd(), 'voices', `${fileName}.wav`);
    const resource = createAudioResource(voicePath, {
      inputType: StreamType.Arbitrary,
    });
    this.player.play(resource);
    await entersState(this.player, AudioPlayerStatus.Idle, 2 ** 31 - 1);
  }

  private async toggleMute(mute: boolean) {
    await Promise.all(
      this.channel.members
        .filter((m) => this.memberIds.includes(m.user.id))
        .map((m) => m.edit({ mute })),
    );
  }

  private name(identity: Interaction | string) {
    const discordId = typeof identity === 'string' ? identity : identity.user.id;
    return this.channel.guild.members.cache.get(discordId)?.displayName ?? '名無しの虚構';
  }
}
