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
export function addProject(name: string, color: string) {
  const id = Date.now().toString();
  const createdAt = new Date().toISOString();
  db.runSync(
    `INSERT INTO projects (id, name, color, status, created_at) VALUES (?, ?, ?, 'active', ?);`,
    [id, name, color, createdAt]
  );
  return id;
}

export function getAllProjects() {
  return db.getAllSync<{
    id: string;
    name: string;
    color: string;
    due_date: string | null;
    status: string;
    created_at: string;
  }>('SELECT * FROM projects ORDER BY created_at DESC;');
}