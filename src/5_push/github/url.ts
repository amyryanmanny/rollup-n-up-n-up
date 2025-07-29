type DiscussionCategoryMatch = {
  owner: string;
  repo: string;
  categoryName: string | undefined;
};

export function matchDiscussionCategoryUrl(
  url: string,
): DiscussionCategoryMatch {
  // Handle repo path, including /discussions/categories/{category} subpath
  const urlParts = new URL(url);
  const match = urlParts.pathname.match(
    /\/([^/]+)\/([^/]+)\/discussions(?:\/categories\/([^/]+))?/,
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
