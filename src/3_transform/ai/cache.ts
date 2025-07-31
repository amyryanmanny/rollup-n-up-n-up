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

  private constructor() {
    // Ensure the directory exists
    if (!fs.existsSync(ACTIONS_CACHE_DIR)) {
      fs.mkdirSync(ACTIONS_CACHE_DIR, { recursive: true });
    }
  }

  static getPromptCacheKey(
    prompt: PromptParameters,
    sources: string[],
  ): string {
    // Generate a deterministic cache key from PromptParameters and sources
    const json = JSON.stringify({
      name: prompt.name,
      modelParameters: prompt.modelParameters,
      prompt: prompt.messages, // Message order is important
      sources: sources.sort(),
    });
    return crypto.createHash("sha256").update(json).digest("hex").slice(0, 8);
  }

  static getCacheFile(cacheKey: string): string {
    return path.join(ACTIONS_CACHE_DIR, `summary-cache-${cacheKey}.json`);
  }

  async get(
    prompt: PromptParameters,
    sources: string[],
  ): Promise<string | undefined> {
    const cacheKey = SummaryCache.getPromptCacheKey(prompt, sources);
    return this.load(cacheKey);
  }

  async set(prompt: PromptParameters, sources: string[], summary: string) {
    const cacheKey = SummaryCache.getPromptCacheKey(prompt, sources);
    await this.save(cacheKey, summary);
  }

  private async save(key: string, summary: string) {
    const file = SummaryCache.getCacheFile(key);

    // Write the cache to a file
    console.log(`Saving summary cache to ${file}`);
    await fs.promises.writeFile(file, summary, "utf-8");

    // Use @actions/cache to cache file to the runner
    // TODO: Don't try to save twice
    if (process.env.GITHUB_ACTIONS === "true") {
      await saveCache([file], key);
    }
  }

  private async load(key: string): Promise<string | undefined> {
    const file = SummaryCache.getCacheFile(key);

    // Use @actions/cache to restore  file from the runner
    if (process.env.GITHUB_ACTIONS === "true") {
      const restored = await restoreCache([file], key);
      if (!restored) {
        return;
      }
    }

    // Check if the file exists
    const exists = fs.existsSync(file);
    if (!exists) {
      return;
    }

    // Load the cache from the file
    console.log(`Loading summary cache from ${file}`);
    return fs.promises.readFile(file, "utf-8");
  }

  async clear() {
    const files = await fs.promises.readdir(ACTIONS_CACHE_DIR);
    await Promise.all(
      files.map((file) =>
        fs.promises.unlink(path.join(ACTIONS_CACHE_DIR, file)),
      ),
    );
  }
}
