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
