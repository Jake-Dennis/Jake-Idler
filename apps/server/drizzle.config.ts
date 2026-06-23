import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema",
  out: "./drizzle",
  dbCredentials: {
    url: "./data/jake_idler.db",
  },
});
