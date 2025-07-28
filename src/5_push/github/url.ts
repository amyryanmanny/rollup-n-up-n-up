type DiscussionCategoryMatch = {
  owner: string;
  repo: string;
  categoryName: string | undefined;
};

export function matchDiscussionCategoryUrl(
  url: string,
): DiscussionCategoryMatch {
  // Handle repo path, including /discussions/categories/{category} subpath
  const match = url.match(
    /https:\/\/github\.com\/([^/]+)\/([^/]+)\/discussions(?:\/categories\/([^/]+))?/,
  );
  if (!match) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }
  const [, owner, repo, categoryName] = match;

  if (!owner || !repo) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }

  return { owner, repo, categoryName };
}
