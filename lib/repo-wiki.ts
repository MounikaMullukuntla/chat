const REPO_WIKI_SUFFIX = "-wiki";
export const DEFAULT_CODECHAT_GITHUB_ACCOUNT = "modelearth";

function normalizeRepoName(repoName: string): string {
  return repoName.trim().replace(/\/+$/, "").replace(/\.git$/, "").split("/").pop() ?? repoName.trim();
}

export function buildRepoWikiSlug(repoName: string): string {
  return `${normalizeRepoName(repoName)}${REPO_WIKI_SUFFIX}`;
}

export function isRepoWikiSlug(slug: string): boolean {
  return slug.endsWith(REPO_WIKI_SUFFIX) && slug.length > REPO_WIKI_SUFFIX.length;
}

export function parseRepoNameFromWikiSlug(slug: string): string | null {
  if (!isRepoWikiSlug(slug)) return null;
  return slug.slice(0, -REPO_WIKI_SUFFIX.length);
}

export function buildRepoWikiHref({
  repoName,
  githubAccount,
}: {
  repoName: string;
  githubAccount?: string | null;
}): string {
  const slug = buildRepoWikiSlug(repoName);
  const account = githubAccount?.trim();

  if (!account || account === DEFAULT_CODECHAT_GITHUB_ACCOUNT) {
    return `/${slug}`;
  }

  return `/${slug}?githubAccount=${encodeURIComponent(account)}`;
}

export function buildRepoReadmeUrl({
  repoName,
  githubAccount,
}: {
  repoName: string;
  githubAccount?: string | null;
}): string {
  const account = githubAccount?.trim() || DEFAULT_CODECHAT_GITHUB_ACCOUNT;
  const repo = normalizeRepoName(repoName);

  return `https://raw.githubusercontent.com/${account}/${repo}/refs/heads/main/README.md`;
}

export function isRepoWikiPath(pathname: string): boolean {
  const [pathWithoutQuery] = pathname.split("?");
  const trimmed = pathWithoutQuery.replace(/^\/+|\/+$/g, "");
  return isRepoWikiSlug(trimmed);
}
