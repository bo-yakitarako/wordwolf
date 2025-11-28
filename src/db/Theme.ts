import { Model } from './Model';

export namespace Theme {
  export type Data = {
    words: [string, string];
    guildId: string | null;
    authorId: string;
  };
}

export class Theme extends Model<Theme.Data> {
  protected static _collectionName = 'themes';

  public get words() {
    return this._data.words;
  }

  public get guildId() {
    return this._data.guildId;
  }

  public get authorId() {
    return this._data.authorId;
  }
}
