const Database = require('better-sqlite3');
const path = require('path');

const dbPath = '/Volumes/FlexibleWorkplace/side-pr/TheAndbData/andb-storage.db';
const db = new Database(dbPath);

// List tables first
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('SQLite Tables:', tables);

// Let's get the environments
const environments = db.prepare("SELECT * FROM environments").all();
console.log('Environments:', environments);

// Get projects
const projects = db.prepare("SELECT * FROM projects").all();
console.log('Projects:', projects);
