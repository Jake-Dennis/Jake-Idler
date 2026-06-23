import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",

  db: {
    url: process.env.DATABASE_URL ?? "./data/jake_idler.db",
  },
} as const;

export type Config = typeof config;
