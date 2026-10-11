import "dotenv/config";
import { defineConfig } from "prisma/config";
import { databaseUrl } from "./prisma/database-url.mjs";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.mjs",
  },
  datasource: {
    url: databaseUrl,
  },
});
