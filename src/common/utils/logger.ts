import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// @ts-ignore
const { getLogger } = require('andb-logger');

const homeDir = os.homedir();
const logDir = process.env.ANDB_LOG_DIR || path.join(homeDir, '.theandb');

// Ensure base dir exists
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (e) {}
}

const customLogger = getLogger({
  mode: process.env.NODE_ENV || 'production',
  dirpath: logDir,
  logName: 'ANDB',
  theme: 'classic'
});

export const logger = {
  info(...args: any[]) {
    customLogger.info(...args);
    this.writeToFile('INFO', ...args);
  },
  warn(...args: any[]) {
    customLogger.warn(...args);
    this.writeToFile('WARN', ...args);
  },
  error(...args: any[]) {
    customLogger.error(...args);
    this.writeToFile('ERROR', ...args);
  },
  dev(...args: any[]) {
    customLogger.dev(...args);
    this.writeToFile('DEV', ...args);
  },
  writeToFile(level: string, ...args: any[]) {
    try {
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      customLogger.write(`[${level}] ${msg}`, 'combined');
    } catch (e) {}
  }
};
