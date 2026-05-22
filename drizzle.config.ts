import { defineConfig } from 'drizzle-kit';
import os from 'os';
import path from 'path';
import fs from 'fs';

// Resolves the exact same persistent temp/system-temp database path safely on both Windows and Unix
const getDbPath = () => {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  if (process.platform !== 'win32') {
    return '/tmp/sprout.db';
  }
  return path.join(os.tmpdir(), 'sprout.db');
};

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: getDbPath(),
  },
});
