import { defineConfig } from "prisma/config";

const url = process.env.DATABASE_URL ?? "";

// During `prisma generate` (build time) DATABASE_URL is not needed —
// it only generates TypeScript types from the schema.
// DATABASE_URL is only required at runtime (prisma db push / queries).
export default defineConfig({
  schema: "./prisma/schema.prisma",
  ...(url
    ? {
        datasource: { url },
        migrations: {
          adapter: async () => {
            const { PrismaPg } = await import("@prisma/adapter-pg");
            return new PrismaPg({ connectionString: url });
          },
        },
      }
    : {}),
} as any);
