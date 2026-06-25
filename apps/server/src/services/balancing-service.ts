import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, "..", "..", "config", "balancing.json");

export type BalancingConfig = Record<string, unknown>;

class BalancingService {
  private cache: BalancingConfig | null = null;

  /** Load the config from disk (cached after first read). */
  load(): BalancingConfig {
    if (this.cache) return this.cache;
    try {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      this.cache = JSON.parse(raw);
      return this.cache!;
    } catch {
      console.warn("[Balancing] Failed to load config, using defaults");
      this.cache = {};
      return this.cache;
    }
  }

  /** Get a single value. */
  get<T>(key: string, fallback: T): T {
    const cfg = this.load();
    return (cfg[key] as T) ?? fallback;
  }

  /** Get a nested object value (e.g. BASE_DROP_RATES.legendary). */
  getNested<T>(key: string, subKey: string, fallback: T): T {
    const cfg = this.load();
    const obj = cfg[key];
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      return ((obj as Record<string, unknown>)[subKey] as T) ?? fallback;
    }
    return fallback;
  }

  /** Update the config in memory and on disk. */
  update(updates: Record<string, unknown>): BalancingConfig {
    const cfg = this.load();
    for (const [key, value] of Object.entries(updates)) {
      cfg[key] = value;
    }
    this.cache = cfg;
    this.persist();
    return cfg;
  }

  /** Update a nested value (e.g. BASE_DROP_RATES → legendary). */
  updateNested(key: string, subKey: string, value: unknown): BalancingConfig {
    const cfg = this.load();
    const obj = cfg[key];
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      (obj as Record<string, unknown>)[subKey] = value;
    }
    this.cache = cfg;
    this.persist();
    return cfg;
  }

  /** Reset all values to the packaged defaults. */
  reset(): BalancingConfig {
    try {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      this.cache = JSON.parse(raw);
    } catch {
      this.cache = {};
    }
    return this.cache!;
  }

  private persist(): void {
    try {
      const dir = path.dirname(CONFIG_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.cache, null, 2), "utf-8");
    } catch (err) {
      console.error("[Balancing] Failed to persist config:", err);
    }
  }
}

export const balancingService = new BalancingService();
