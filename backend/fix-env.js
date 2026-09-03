import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Common passwords to test
const passwords = [
  "postgres",
  "password",
  "root",
  "admin",
  "1234",
  "123456",
  "12345678",
  "shaik",
  "postgre",
  "123",
  ""
];

const hosts = ["127.0.0.1", "localhost"];
const ports = [5432, 5433];
const databases = ["MafiaGame", "mafiagame", "postgres"];

console.log("🔍 Auto-detecting working PostgreSQL password & port...\n");

async function autoFixEnv() {
  for (const host of hosts) {
    for (const port of ports) {
      for (const database of databases) {
        for (const password of passwords) {
          const client = new Client({
            user: "postgres",
            host,
            port,
            database,
            password,
            connectionTimeoutMillis: 800
          });

          try {
            await client.connect();
            console.log("=========================================");
            console.log("🎉 CONNECTED TO POSTGRESQL SUCCESSFULLY!");
            console.log("=========================================");
            console.log(`Working Host: ${host}`);
            console.log(`Working Port: ${port}`);
            console.log(`Working Database: ${database}`);
            console.log(`Working Password: "${password}"`);
            console.log("=========================================\n");

            // Update .env file automatically
            const envPath = path.resolve(__dirname, ".env");
            const newEnvContent = `# Server Configuration
PORT=5000

# PostgreSQL Database Configuration
DB_USER=postgres
DB_PASSWORD=${password}
DB_HOST=${host}
DB_PORT=${port}
DB_NAME=${database}

# JWT Secret for Auth Tokens
JWT_SECRET=mafia_super_secret_jwt_key_2026
`;
            fs.writeFileSync(envPath, newEnvContent, "utf8");
            console.log("✅ Updated backend/.env file with correct credentials!");
            console.log("👉 Restart your backend (npm run dev) and everything will work!");

            await client.end();
            return;
          } catch (err) {
            try { await client.end(); } catch (_) {}
          }
        }
      }
    }
  }

  console.log("❌ None of the common passwords worked.");
  console.log("👉 Please check pgAdmin 4: What password do you type when opening pgAdmin 4 on your computer?");
}

autoFixEnv();
