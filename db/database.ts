import * as SQLite from 'expo-sqlite';
import { applyXPGain, xpRequiredForLevel, getSubtaskCompletionXP, RankState } from '../features/rank/xpEngine';


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
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      subtask_id TEXT,
      mode TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_minutes INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_rank (
      id TEXT PRIMARY KEY NOT NULL DEFAULT 'singleton',
      rank TEXT NOT NULL DEFAULT 'D',
      level INTEGER NOT NULL DEFAULT 1,
      current_xp INTEGER NOT NULL DEFAULT 0,
      total_lifetime_xp INTEGER NOT NULL DEFAULT 0,
      last_activity_at TEXT,
      decay_paused_until TEXT
    );
    CREATE TABLE IF NOT EXISTS xp_events (
      id TEXT PRIMARY KEY NOT NULL,
      source TEXT NOT NULL,
      amount INTEGER NOT NULL,
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

  const siblingsQuery = parentSubtaskId
    ? db.getFirstSync<{ maxOrder: number | null }>(
        `SELECT MAX(order_index) as maxOrder FROM subtasks WHERE parent_subtask_id = ?;`,
        [parentSubtaskId]
      )
    : db.getFirstSync<{ maxOrder: number | null }>(
        `SELECT MAX(order_index) as maxOrder FROM subtasks WHERE project_id = ? AND parent_subtask_id IS NULL;`,
        [projectId]
      );

  const nextOrderIndex = (siblingsQuery?.maxOrder ?? -1) + 1;

  db.runSync(
    `INSERT INTO subtasks (id, project_id, parent_subtask_id, title, is_complete, order_index, difficulty, est_minutes, source, created_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?);`,
    [id, projectId, parentSubtaskId, title, nextOrderIndex, difficulty, estMinutes, source, createdAt]
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
  const alreadyAwarded = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM xp_events WHERE source = ?;`,
    [`subtask_complete:${subtaskId}`]
  );

  const subtask = db.getFirstSync<{ difficulty: string | null }>(
    `SELECT difficulty FROM subtasks WHERE id = ?;`,
    [subtaskId]
  );

  db.runSync(`UPDATE subtasks SET is_complete = ? WHERE id = ?;`, [
    isComplete ? 1 : 0,
    subtaskId,
  ]);

  if (isComplete && (alreadyAwarded?.count ?? 0) === 0) {
    const xpAmount = getSubtaskCompletionXP(subtask?.difficulty ?? null);
    awardXP(`subtask_complete:${subtaskId}`, xpAmount);
  }
}
export function updateSubtask(
  id: string,
  title: string,
  difficulty: string | null,
  estMinutes: number | null
) {
  db.runSync(
    `UPDATE subtasks SET title = ?, difficulty = ?, est_minutes = ? WHERE id = ?;`,
    [title, difficulty, estMinutes, id]
  );
}

export function deleteSubtask(id: string) {
  db.runSync(`DELETE FROM subtasks WHERE id = ?;`, [id]);
}

export function updateSubtaskOrder(id: string, orderIndex: number) {
  db.runSync(`UPDATE subtasks SET order_index = ? WHERE id = ?;`, [orderIndex, id]);
}
export function startFocusSession(subtaskId: string | null, mode: 'pomodoro' | 'flowtime') {
  const id = Date.now().toString();
  const startTime = new Date().toISOString();
  db.runSync(
    `INSERT INTO focus_sessions (id, subtask_id, mode, start_time, created_at) VALUES (?, ?, ?, ?, ?);`,
    [id, subtaskId, mode, startTime, startTime]
  );
  return id;
}

export function endFocusSession(sessionId: string, durationMinutes: number) {
  const endTime = new Date().toISOString();
  db.runSync(
    `UPDATE focus_sessions SET end_time = ?, duration_minutes = ? WHERE id = ?;`,
    [endTime, durationMinutes, sessionId]
  );
}
export function getCompletedSessionCount(subtaskId: string) {
  const result = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM focus_sessions WHERE subtask_id = ? AND end_time IS NOT NULL AND mode = 'pomodoro';`,
    [subtaskId]
  );
  return result?.count ?? 0;
}
export function updateProjectName(id: string, name: string) {
  db.runSync(`UPDATE projects SET name = ? WHERE id = ?;`, [name, id]);
}
export function getUserRank() {
  const existing = db.getFirstSync<{
    id: string;
    rank: string;
    level: number;
    current_xp: number;
    total_lifetime_xp: number;
    last_activity_at: string | null;
    decay_paused_until: string | null;
  }>('SELECT * FROM user_rank WHERE id = ?;', ['singleton']);

  if (existing) return existing;

  db.runSync(
    `INSERT INTO user_rank (id, rank, level, current_xp, total_lifetime_xp) VALUES ('singleton', 'D', 1, 0, 0);`
  );
  return getUserRank();
}

export function saveUserRank(rank: string, level: number, currentXp: number, totalLifetimeXp: number) {
  const now = new Date().toISOString();
  db.runSync(
    `UPDATE user_rank SET rank = ?, level = ?, current_xp = ?, total_lifetime_xp = ?, last_activity_at = ? WHERE id = 'singleton';`,
    [rank, level, currentXp, totalLifetimeXp, now]
  );
}

export function logXPEvent(source: string, amount: number) {
  const id = Date.now().toString();
  const createdAt = new Date().toISOString();
  db.runSync(
    `INSERT INTO xp_events (id, source, amount, created_at) VALUES (?, ?, ?, ?);`,
    [id, source, amount, createdAt]
  );
}
export function awardXP(source: string, amount: number) {
  const current = getUserRank();
  const state: RankState = {
    rank: current.rank as any,
    level: current.level,
    currentXp: current.current_xp,
    totalLifetimeXp: current.total_lifetime_xp,
  };

  const result = applyXPGain(state, amount);
  saveUserRank(
    result.newState.rank,
    result.newState.level,
    result.newState.currentXp,
    result.newState.totalLifetimeXp
  );
  logXPEvent(source, amount);

  return result;
}
export function getRankProgress() {
  const rank = getUserRank();
  const required = xpRequiredForLevel(rank.rank as any, rank.level + 1);
  return {
    rank: rank.rank,
    level: rank.level,
    currentXp: rank.current_xp,
    xpRequired: required,
    totalLifetimeXp: rank.total_lifetime_xp,
  };
}
export function getRecentXPEvents(limit: number = 20) {
  return db.getAllSync<{
    id: string;
    source: string;
    amount: number;
    created_at: string;
  }>('SELECT * FROM xp_events ORDER BY created_at DESC LIMIT ?;', [limit]);
}