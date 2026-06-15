"use strict";

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DATA_DIR = process.env.TUP_DATA_DIR || path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "tup.db");

let db;

function getDB() {
  if (db) return db;

  fs.mkdirSync(DATA_DIR, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  return db;
}

function initDB() {
  const conn = getDB();
  const version = conn.pragma("user_version", { simple: true });

  if (version < 1) {
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    // Filter out PRAGMA statements (already set above) and execute DDL
    const ddl = schema
      .split("\n")
      .filter(line => !line.trim().startsWith("PRAGMA"))
      .join("\n");
    conn.exec(ddl);
    conn.pragma("user_version = 1");
    console.log("[db] Initialized schema v1");
  }

  if (version < 2) {
    conn.exec(`
      CREATE TABLE IF NOT EXISTS search_history (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ticker       TEXT    NOT NULL,
        searched_at  TEXT    NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_search_history_user_date
        ON search_history(user_id, searched_at);
    `);
    conn.pragma("user_version = 2");
    console.log("[db] Migrated schema to v2 (search_history)");
  }

  return conn;
}

module.exports = { getDB, initDB };
