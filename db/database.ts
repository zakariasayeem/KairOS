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
    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      parent_subtask_id TEXT,
      title TEXT NOT NULL,
      is_complete INTEGER NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL,
      difficulty TEXT,
      est_minutes INTEGER,
      source TEXT NOT NULL DEFAULT 'manual',
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

export function addSubtask(
  projectId: string,
  title: string,
  parentSubtaskId: string | null = null,
  difficulty: string | null = null,
  estMinutes: number | null = null,
  source: string = 'manual'
) {
  const id = Date.now().toString();
  const createdAt = new Date().toISOString();
  db.runSync(
    `INSERT INTO subtasks (id, project_id, parent_subtask_id, title, is_complete, order_index, difficulty, est_minutes, source, created_at) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?);`,
    [id, projectId, parentSubtaskId, title, difficulty, estMinutes, source, createdAt]
  );
  return id;
}

export function getSubtasksForProject(projectId: string) {
  return db.getAllSync<{
    id: string;
    project_id: string;
    parent_subtask_id: string | null;
    title: string;
    is_complete: number;
    order_index: number;
    difficulty: string | null;
    est_minutes: number | null;
    source: string;
    created_at: string;
  }>(
    'SELECT * FROM subtasks WHERE project_id = ? ORDER BY created_at ASC;',
    [projectId]
  );
}

export function toggleSubtaskComplete(subtaskId: string, isComplete: boolean) {
  db.runSync(`UPDATE subtasks SET is_complete = ? WHERE id = ?;`, [
    isComplete ? 1 : 0,
    subtaskId,
  ]);
}