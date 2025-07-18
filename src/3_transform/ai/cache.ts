import fs from "fs";
import path from "path";

import type { PromptParameters } from "@transform/ai/summarize";
import { saveCache, restoreCache } from "@actions/cache";

const ACTIONS_CACHE_KEY = "summary-cache"; // Just use one until it causes problems
const ACTIONS_CACHE_FILE = "./cache/summary-cache.json";

// Singleton
export class SummaryCache {
  private static instance: SummaryCache;

  static getInstance() {
    if (!SummaryCache.instance) {
      SummaryCache.instance = new SummaryCache();
    }
    return SummaryCache.instance;
  }

  private cache: Map<string, string>;

  private constructor() {
    this.cache = new Map<string, string>();
  }

  static getPromptCacheKey(prompt: PromptParameters): string {
    // Generate a cache key from PromptParameters
    // Not exactly deterministic, but should work
    return JSON.stringify(prompt);
  }

  get(prompt: PromptParameters): string | undefined {
    const cacheKey = SummaryCache.getPromptCacheKey(prompt);
    return this.cache.get(cacheKey);
  }

  set(prompt: PromptParameters, summary: string) {
    const cacheKey = SummaryCache.getPromptCacheKey(prompt);
    this.cache.set(cacheKey, summary);
  }

  save() {
    const file = path.resolve(ACTIONS_CACHE_FILE);
    const dir = path.dirname(file);

    // Ensure the directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the cache to a file
    console.log(`Saving summary cache to ${file}`);
    const entries = Array.from(this.cache.entries());
    const blob = JSON.stringify(entries, null, 2);
    fs.writeFileSync(file, blob, "utf-8");

    // Use @actions/cache to cache file to the runner
    saveCache([file], ACTIONS_CACHE_KEY);
  }

  load() {
    const file = path.resolve(ACTIONS_CACHE_FILE);
    if (!fs.existsSync(file)) {
      return;
    }

    // Use @actions/cache to restore  file from the runner
    const restored = restoreCache([file], ACTIONS_CACHE_KEY);
    if (!restored) {
      console.warn(`No cache hit for ${file}. Using empty cache.`);
      return;
    }

    // Load the cache from the file
    console.log(`Loading summary cache from ${file}`);
    const blob = fs.readFileSync(file, "utf-8");
    const entries: [string, string][] = JSON.parse(blob);
    this.cache = new Map<string, string>(entries);
  }
}
