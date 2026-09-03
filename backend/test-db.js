import pg from "pg";
const { Client } = pg;

const hosts = ["127.0.0.1", "localhost"];
const ports = [5432, 5433, 5434];
const passwords = ["password", "postgres", "root", "admin", ""];
const databases = ["MafiaGame", "MaifaGame", "mafiagame", "postgres"];

console.log("🔍 Scanning all PostgreSQL connection combinations...\n");

async function scan() {
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
            connectionTimeoutMillis: 1000
          });

          try {
            await client.connect();
            console.log("=========================================");
            console.log("🎉 WORKING CONNECTION FOUND!");
            console.log("=========================================");
            console.log(`DB_HOST=${host}`);
            console.log(`DB_PORT=${port}`);
            console.log(`DB_USER=postgres`);
            console.log(`DB_PASSWORD=${password === "" ? "(empty)" : password}`);
            console.log(`DB_NAME=${database}`);
            console.log("=========================================\n");
            await client.end();
            return;
          } catch (err) {
            try { await client.end(); } catch (_) {}
          }
        }
      }
    }
  }

  console.log("❌ Could not connect automatically.");
  console.log("👉 Please check pgAdmin 4: Right-click your Server > Properties > Connection tab.");
  console.log("👉 Look at the 'Port' (e.g. 5433 instead of 5432) and 'Host name/address'.");
}

scan();
