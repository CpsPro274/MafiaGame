import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { Pool } = pg;

const dbPassword = process.env.DB_PASSWORD || "password";
const dbUser = process.env.DB_USER || "postgres";
const dbHost = process.env.DB_HOST || "127.0.0.1";
const dbPort = parseInt(process.env.DB_PORT || "5432", 10);
const dbName = process.env.DB_NAME || "MafiaGame";

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      user: dbUser,
      host: dbHost,
      database: dbName,
      password: String(dbPassword),
      port: dbPort,
    });

export const query = (text, params) => pool.query(text, params);

export async function testDbConnection() {
  try {
    const res = await pool.query("SELECT current_database(), NOW()");
    console.log(`PostgreSQL Connected to database: "${res.rows[0].current_database}"`);
    return true;
  } catch (err) {
    if (err.message.includes("does not exist") || err.message.includes("database")) {
      try {
        const fallbackPool = process.env.DATABASE_URL
          ? new Pool({ connectionString: process.env.DATABASE_URL.replace(/\/([^/]+)$/, `/${dbName.toLowerCase()}`) })
          : new Pool({
              user: dbUser,
              host: dbHost,
              database: dbName.toLowerCase(),
              password: String(dbPassword),
              port: dbPort,
            });
        const res2 = await fallbackPool.query("SELECT current_database(), NOW()");
        console.log(`PostgreSQL Connected to database: "${res2.rows[0].current_database}"`);
        return true;
      } catch (_) {}
    }
    console.error(`PostgreSQL Connection Failed: ${err.message}`);
    return false;
  }
}
