# Code Mafia: Database Setup & Migration Guide

This directory contains the database definition for **Code Mafia: Multiplayer Collaborative Debugging Challenge**.

---

## Files Overview

1. [`schema.sql`](./schema.sql): Raw PostgreSQL DDL with tables, indexes, UUIDs, foreign keys, and trigger functions.
2. [`seed.sql`](./seed.sql): Starter test users and an intentionally buggy coding challenge with public & hidden test cases.
3. [`../prisma/schema.prisma`](../prisma/schema.prisma): Complete Prisma ORM schema for Node.js / TypeScript backends.

---

## How to Apply the Schema

### Option A: Using Raw PostgreSQL (psql / Docker)

1. **Start PostgreSQL** (or use your existing instance):
   ```bash
   # Example with Docker
   docker run --name mafia-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=codemafia -p 5432:5432 -d postgres:16-alpine
   ```

2. **Execute Schema & Seed**:
   ```bash
   psql -U postgres -d codemafia -f backend/database/schema.sql
   psql -U postgres -d codemafia -f backend/database/seed.sql
   ```

---

### Option B: Using Prisma ORM (Recommended for Node.js backend)

1. Set your `DATABASE_URL` in `backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/codemafia?schema=public"
   ```

2. Run Prisma migration:
   ```bash
   cd backend
   npx prisma migrate dev --name init
   npx prisma generate
   ```
