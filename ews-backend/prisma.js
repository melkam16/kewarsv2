import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;

// Dynamically clean connection string to remove channel_binding=require
let connectionString = process.env.DATABASE_URL || '';
if (connectionString.includes('channel_binding=require')) {
  connectionString = connectionString.replace('channel_binding=require', '')
                                     .replace('&&', '&')
                                     .replace('?&', '?')
                                     .replace(/&$/, '');
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
