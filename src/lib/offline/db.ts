import Dexie, { type Table } from 'dexie';

export interface OutboxRequest {
  id?: number;
  action: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  createdAt: string;
}

export class FinTrackDB extends Dexie {
  outbox!: Table<OutboxRequest, number>;

  constructor() {
    super('FinTrackDB');
    this.version(1).stores({
      outbox: '++id, action, createdAt',
    });
  }
}

export const db = new FinTrackDB();
