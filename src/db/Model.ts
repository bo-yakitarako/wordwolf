import dayjs from 'dayjs';
import { config } from 'dotenv';
import {
  Collection,
  Document,
  Filter,
  MongoClient,
  OptionalUnlessRequiredId,
  WithId,
} from 'mongodb';

config();

type BasePropsWithoutId = { createdAt: number; updatedAt: number };
export type BaseProps = WithId<BasePropsWithoutId>;

/** Modelのサブクラスからジェネリクスの型を抽出するユーティリティ型 */
export type ModelData<M> = M extends Model<infer T> ? T : never;

type ModelClass<C extends Model<T>, T extends Document = Document> = {
  new (data: BaseProps & T): C;
  collectionName: string;
};

export class Model<T extends Document = Document> {
  protected static _collectionName: string = '';
  protected _data: BaseProps & T;

  constructor(data: BaseProps & T) {
    this._data = data;
  }

  public get id() {
    return this._data._id;
  }

  public get createdAt() {
    return dayjs(this._data.createdAt);
  }

  public get updatedAt() {
    return dayjs(this._data.updatedAt);
  }

  private get collectionName() {
    return (this.constructor as typeof Model<T>).collectionName;
  }

  public static get collectionName() {
    return this._collectionName;
  }

  public static async create<C extends Model<T>, T extends Document = Document>(
    this: ModelClass<C, T>,
    data: T,
  ): Promise<C> {
    return connect<BasePropsWithoutId & T, C>(this.collectionName, async (collection) => {
      const now = Date.now();
      const inserted: BasePropsWithoutId & T = { ...data, createdAt: now, updatedAt: now };
      const result = await collection.insertOne(
        inserted as OptionalUnlessRequiredId<T & BasePropsWithoutId>,
      );
      return new this({ _id: result.insertedId, ...inserted });
    });
  }

  public static async createMany<C extends Model<T>, T extends Document = Document>(
    this: ModelClass<C, T>,
    data: T[],
  ): Promise<C[]> {
    return connect<BasePropsWithoutId & T, C[]>(this.collectionName, async (collection) => {
      const now = Date.now();
      const inserted = data.map((item) => ({ ...item, createdAt: now, updatedAt: now }));
      const result = await collection.insertMany(
        inserted as OptionalUnlessRequiredId<T & BasePropsWithoutId>[],
      );
      return Object.values(result.insertedIds).map(
        (id) =>
          new this({ ...(inserted.find((item) => item._id === id) as BaseProps & T), _id: id }),
      );
    });
  }

  public static async find<T extends Document, C extends Model<T>>(
    this: ModelClass<C, T>,
    query: Filter<BaseProps & T> = {} as Filter<BaseProps & T>,
  ): Promise<C | null> {
    return connect<BaseProps & T, C | null>(this.collectionName, async (collection) => {
      const result = await collection.findOne(query);
      if (result === null) return null;
      return new this(result as BaseProps & T);
    });
  }

  public static async findMany<T extends Document, C extends Model<T>>(
    this: ModelClass<C, T>,
    query: Filter<BaseProps & T> = {} as Filter<BaseProps & T>,
  ): Promise<C[]> {
    return connect<BaseProps & T, C[]>(this.collectionName, async (collection) => {
      const result = await collection.find(query).toArray();
      return result.map((item) => new this(item as BaseProps & T));
    });
  }

  public set(data: Partial<T>) {
    this._data = { ...this._data, ...data };
  }

  public async save() {
    await connect<BaseProps & T, void>(this.collectionName, async (collection) => {
      const $set = { ...this._data, updatedAt: Date.now() };
      await collection.updateOne({ _id: this.id } as Filter<BaseProps & T>, { $set });
    });
  }

  public async update(data: Partial<T>) {
    this.set(data);
    await this.save();
  }

  public async delete() {
    await connect<BaseProps & T, void>(this.collectionName, async (collection) => {
      await collection.deleteOne({ _id: this.id } as Filter<BaseProps & T>);
    });
  }
}

async function connect<T extends Document, K>(
  collectionName: string,
  fn: (collection: Collection<T>) => Promise<K>,
): Promise<K> {
  return new Promise(async (resolve, reject) => {
    const client = new MongoClient(process.env.MONGO_URI as string);
    try {
      const db = client.db(process.env.DB_NAME as string);
      const collection = db.collection<T>(collectionName);
      const result = await fn(collection);
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      await client.close();
    }
  });
}
