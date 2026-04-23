import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Github } from "lucide-react";
import { Response } from "@/components/elements/response";
import {
  buildRepoReadmeUrl,
  DEFAULT_CODECHAT_GITHUB_ACCOUNT,
  isRepoWikiSlug,
  parseRepoNameFromWikiSlug,
} from "@/lib/repo-wiki";

async function fetchReadme(readmeUrl: string): Promise<string | null> {
  try {
    const response = await fetch(readmeUrl, { next: { revalidate: 3600 } });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export default async function RepoWikiPage({
  params,
  searchParams,
}: {
  params: Promise<{ wikiSlug: string }>;
  searchParams: Promise<{ githubAccount?: string | string[] }>;
}) {
  const { wikiSlug } = await params;
  const { githubAccount } = await searchParams;

  if (!isRepoWikiSlug(wikiSlug)) {
    notFound();
  }

  const repoName = parseRepoNameFromWikiSlug(wikiSlug);
  if (!repoName) {
    notFound();
  }

  const account =
    typeof githubAccount === "string"
      ? githubAccount.trim() || DEFAULT_CODECHAT_GITHUB_ACCOUNT
      : DEFAULT_CODECHAT_GITHUB_ACCOUNT;

  const readmeUrl = buildRepoReadmeUrl({ repoName, githubAccount: account });
  const repositoryUrl = `https://github.com/${account}/${repoName}`;
  const readme = await fetchReadme(readmeUrl);

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-[28px] border border-border/60 bg-card/95 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Github size={14} />
                README wiki
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{repoName}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{account}/{repoName}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Github size={15} />
                Repository
              </Link>
              <Link
                href={readmeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <ExternalLink size={15} />
                Raw README
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-border/60 bg-card/95 p-6 shadow-sm backdrop-blur">
          {readme ? (
            <Response className="prose prose-neutral max-w-none dark:prose-invert prose-pre:rounded-2xl prose-pre:border prose-pre:border-border/60 prose-pre:bg-muted/40 prose-img:rounded-2xl">
              {readme}
            </Response>
          ) : (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">README not available</h2>
              <p className="text-sm text-muted-foreground">
                The README could not be loaded from{" "}
                <Link href={readmeUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                  {readmeUrl}
                </Link>
                .
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
