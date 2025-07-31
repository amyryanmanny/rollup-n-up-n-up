import { SummaryCache } from "@transform/ai/cache";

export default function clear() {
  console.log("Clearing summary cache");

  const cache = SummaryCache.getInstance();
  cache.clear();
}

clear();
