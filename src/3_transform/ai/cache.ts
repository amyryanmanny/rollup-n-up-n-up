import crypto from "node:crypto";
import fs from "fs";
import path from "path";

import { saveCache, restoreCache } from "@actions/cache";

import type { PromptParameters } from "./summarize";

// Scope the cache to the current repository
const ACTIONS_CACHE_DIR = path.resolve("./cache");

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

  static getPromptCacheKey(
    prompt: PromptParameters,
    sources: string[],
  ): string {
    // Generate a deterministic cache key from PromptParameters and sources
    const json = JSON.stringify({
      name: prompt.name,
      prompt: prompt.messages, // Message order is important
      sources: sources.sort(),
    });
    return crypto.createHash("sha256").update(json).digest("hex");
  }

  static getCacheFile(cacheKey: string): string {
    return path.join(ACTIONS_CACHE_DIR, `summary-cache-${cacheKey}.json`);
  }

  get(prompt: PromptParameters, sources: string[]): string | undefined {
    const cacheKey = SummaryCache.getPromptCacheKey(prompt, sources);
    this.load(cacheKey);
    return this.cache.get(cacheKey);
  }

  set(prompt: PromptParameters, sources: string[], summary: string) {
    const cacheKey = SummaryCache.getPromptCacheKey(prompt, sources);
    this.cache.set(cacheKey, summary);
    this.save(cacheKey);
  }

  private save(key: string) {
    const file = SummaryCache.getCacheFile(key);

    // Ensure the directory exists
    if (!fs.existsSync(ACTIONS_CACHE_DIR)) {
      fs.mkdirSync(ACTIONS_CACHE_DIR, { recursive: true });
    }

    // Write the cache to a file
    console.log(`Saving summary cache to ${file}`);
    const entries = Object.fromEntries(this.cache.entries());
    const blob = JSON.stringify(entries, null, 2);
    fs.writeFileSync(file, blob, "utf-8");

    // Use @actions/cache to cache file to the runner
    if (process.env.GITHUB_ACTIONS === "true") {
      saveCache([file], key);
    }
  }

  private load(key: string) {
    const file = SummaryCache.getCacheFile(key);

    if (!fs.existsSync(file)) {
      return;
    }

    // Use @actions/cache to restore  file from the runner
    if (process.env.GITHUB_ACTIONS === "true") {
      const restored = restoreCache([file], key);
      if (!restored) {
        console.warn(`No cache hit for ${file}. Using empty cache.`);
        return;
      }
    }

    // Load the cache from the file
    console.log(`Loading summary cache from ${file}`);
    const blob = fs.readFileSync(file, "utf-8");
    const entries: Map<string, string> = JSON.parse(blob);
    this.cache = new Map<string, string>(Object.entries(entries));
  }

  clear() {
    this.cache.clear();
    for (const file of fs.readdirSync(ACTIONS_CACHE_DIR)) {
      fs.unlinkSync(path.join(ACTIONS_CACHE_DIR, file));
    }
  }
}
