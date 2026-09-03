# Code Mafia: Simple Database Guide

Database ko 2 alag-alag aur simple files me divide kar diya gaya hai:

---

## 📁 Files

1. **[`auth_schema.sql`](./auth_schema.sql)** 👉 **Login & User Auth**
   * Sirf `users` table (ID, username, email, password, wins).

2. **[`game_schema.sql`](./game_schema.sql)** 👉 **Game Logic**
   * `challenges` (Buggy code + solutions + test cases)
   * `rooms` (Game lobbies & room codes)
   * `room_players` (Secret Developer / Mafia roles)
   * `votes` (Emergency meeting voting)
   * `game_logs` (Post-match replay timeline)

3. **[`seed.sql`](./seed.sql)** 👉 **Sample Test Data**
   * 2 sample users (`alex_dev`, `sam_mafia`)
   * 1 ready-to-test buggy JavaScript challenge with test cases.

---

## 🚀 How to Run in PostgreSQL

```bash
# 1. Login & Auth table banayein
psql -U postgres -d codemafia -f backend/database/auth_schema.sql

# 2. Game logic tables banayein
psql -U postgres -d codemafia -f backend/database/game_schema.sql

# 3. Sample data load karein
psql -U postgres -d codemafia -f backend/database/seed.sql
```
