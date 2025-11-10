import { getConfig, isTruthy } from "@config";

import type { RateLimit } from "./fragments/rate-limit";

const queryDebugEnabled = isTruthy(getConfig("DEBUG_GRAPHQL_QUERIES"));

let rateLimitRunningTotal = 0;
let durationRunningTotal = 0;
const durationMap = new Map<string, number>();
const maxDurationMap = new Map<string, number>();

export function debugGraphQL(
  caller: string,
  params: unknown,
  response: Required<RateLimit>,
  startTime: Date,
) {
  try {
    const duration = new Date().getTime() - startTime.getTime();

    rateLimitRunningTotal += response.rateLimit.cost;
    durationRunningTotal += duration;
    durationMap.set(caller, (durationMap.get(caller) ?? 0) + duration);
    maxDurationMap.set(
      caller,
      Math.max(maxDurationMap.get(caller) ?? 0, duration),
    );

    if (queryDebugEnabled) {
      console.log(`Query: "${caller}"`);
      console.log(`${JSON.stringify(params, null, 2)}`);
      console.log(`  -> Rate limit cost: ${response.rateLimit.cost}\n`);
    }
  } catch (error: unknown) {
    // Debug functions shouldn't throw
    console.error(`Error in debugGraphQLRateLimit: ${error}`);
    console.trace();
  }
}

export function logGraphQLTotals() {
  console.log("======== GraphQL Totals ========");

  console.log(`Total RateLimit cost of this Report: ${rateLimitRunningTotal}`);
  console.log(
    `Total Duration of GraphQL Requests: ${durationRunningTotal / 1000}s`,
  );

  console.log("Total Duration by Query:");
  for (const [key, value] of Array.from(durationMap.entries()).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  -> ${key}: ${value / 1000}s`);
  }

  console.log("Max Duration by Query:");
  for (const [key, value] of Array.from(maxDurationMap.entries()).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  -> ${key}: ${value / 1000}s`);
  }

  console.log("================================");
}

export function resetGraphQLTotals() {
  rateLimitRunningTotal = 0;
  durationRunningTotal = 0;
  durationMap.clear();
  maxDurationMap.clear();
}
