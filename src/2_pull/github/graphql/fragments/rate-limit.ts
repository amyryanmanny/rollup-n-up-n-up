import { getConfig } from "@util/config";

export const rateLimitFragment = `
  rateLimit {
    cost
  }
`;

export type RateLimit = {
  rateLimit: {
    cost: number;
  };
};

let runningTotal = 0;

export function debugGraphQLRateLimit(
  caller: string,
  params: unknown,
  response: RateLimit,
) {
  runningTotal += response.rateLimit.cost;
  if (getConfig("DEBUG_RATE_LIMIT_QUERY_COST")) {
    console.log(`Query: "${caller}"`);
    console.log(`  ${JSON.stringify(params)}`);
    console.log(`  Rate limit cost: ${response.rateLimit.cost}`);
  }
}

export function debugTotalGraphQLRateLimit() {
  console.log(`Total GraphQL RateLimit cost of this Report: ${runningTotal}`);
}
