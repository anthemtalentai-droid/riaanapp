import { defineConfig } from "prisma/config";
import path from "node:path";

// The Prisma CLI (db push / migrate / studio) does NOT auto-load .env.local —
// only Next.js's own dev/build/start commands do. Load it here so `npx prisma
// db push` etc. see the same DATABASE_URL the app runs with.
for (const file of [".env.local", ".env"]) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("dotenv").config({ path: path.join(process.cwd(), file) });
  } catch {
    /* file may not exist — fine, fall through */
  }
}

const url = process.env.DATABASE_URL ?? "";
const isPostgres = url.startsWith("postgresql") || url.startsWith("postgres");

// Mirrors src/lib/prisma.ts's runtime adapter choice: Postgres in production,
// SQLite (better-sqlite3) for local dev — so `prisma db push`/`prisma studio`
// work against whichever DATABASE_URL is actually configured, instead of only
// ever working against a real Postgres instance.
export default defineConfig({
  schema: "./prisma/schema.prisma",
  ...(url
    ? {
        datasource: { url },
        migrations: {
          adapter: async () => {
            if (isPostgres) {
              const { PrismaPg } = await import("@prisma/adapter-pg");
              return new PrismaPg({ connectionString: url });
            }
            const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
            const dbPath = path.join(process.cwd(), "prisma", "dev.db");
            return new PrismaBetterSqlite3({ url: dbPath });
          },
        },
      }
    : {}),
} as any);
