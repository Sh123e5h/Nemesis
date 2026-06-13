import Dexie, { type Table } from 'dexie';

export interface LocalMessage {
  id: string;
  group_id: string;
  sender_id: string;
  receiver_id?: string;
  content: string;
  created_at: string;
  storage_hash?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
  is_pending?: boolean;
  profiles?: {
    full_name: string;
    username: string;
    avatar_url?: string;
  };
  message_reads?: {
    id: string;
    message_id: string;
    user_id: string;
    read_at: string;
  }[];
}

export interface LocalTask {
  id: string;
  created_by: string;
  title: string;
  description?: string;
  due_date?: string;
  status: string;
  created_at: string;
  group_id?: string | null;
  groups?: { name: string } | null;
  subtasks?: {
    id: string;
    title: string;
    is_completed: boolean;
    task_id: string;
  }[];
  is_pending?: boolean;
}

export interface CachedFile {
  hash: string;
  local_path: string;
  mime_type: string;
  last_accessed: number;
}

export class NemesisDatabase extends Dexie {
  messages!: Table<LocalMessage>;
  tasks!: Table<LocalTask>;
  files!: Table<CachedFile>;

  constructor() {
    super('NemesisDB');
    this.version(2).stores({
      messages: 'id, group_id, sender_id, created_at, is_pending, storage_hash, [group_id+created_at]',
      tasks: 'id, created_by, group_id, status, due_date, created_at, is_pending, [created_by+due_date]',
      files: 'hash, local_path'
    });
  }
}

export const db = new NemesisDatabase();
