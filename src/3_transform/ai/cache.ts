import crypto from "node:crypto";
import fs from "fs";
import path from "path";

import { saveCache, restoreCache } from "@actions/cache";

import { isGitHubAction } from "@config";

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
      model: prompt.model,
      prompt: prompt.messages, // Message order is significant
      modelParameters: prompt.modelParameters,
      sources: sources.sort(),
    });
    return crypto.createHash("sha256").update(json).digest("hex").slice(0, 8);
  }

  static getCacheFile(cacheKey: string): string {
    return path.join(ACTIONS_CACHE_DIR, `summary-${cacheKey}.blob`);
  }

  async get(
    prompt: PromptParameters,
    sources: string[],
  ): Promise<string | undefined> {
    const key = SummaryCache.getPromptCacheKey(prompt, sources);
    return this.load(key);
  }

  async set(prompt: PromptParameters, sources: string[], summary: string) {
    const key = SummaryCache.getPromptCacheKey(prompt, sources);
    await this.save(key, summary);
  }

  private async exists(key: string): Promise<boolean> {
    const file = SummaryCache.getCacheFile(key);

    if (isGitHubAction()) {
      const exists = await restoreCache([file], key, undefined, {
        lookupOnly: true,
      });
      return !!exists;
    }

    return fs.existsSync(file);
  }

  private async save(key: string, summary: string) {
    const file = SummaryCache.getCacheFile(key);

    const exists = await this.exists(key);
    if (exists) {
      console.log(`Cache for ${file} already exists, skipping save`);
      return;
    }

    // Write the cache to a file
    console.log(`Saving summary cache to ${file}`);
    await fs.promises.writeFile(file, summary, "utf-8");

    // Use @actions/cache to cache the file to the runner
    if (isGitHubAction()) {
      await saveCache([file], key);
    }
  }

  private async load(key: string): Promise<string | undefined> {
    const file = SummaryCache.getCacheFile(key);

    // Use @actions/cache to restore the file from the runner
    if (isGitHubAction()) {
      const restored = await restoreCache([file], key);
      if (!restored) {
        return;
      }
    } else {
      const exists = await this.exists(key);
      if (!exists) {
        return;
      }
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
