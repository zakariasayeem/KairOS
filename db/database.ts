import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('kairos.db');

export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );
  `);
}