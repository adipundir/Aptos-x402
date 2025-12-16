import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/github
 *
 * Real-world API integration: GitHub REST API (public endpoints; rate limited)
 *
 * Query params:
 * - owner: string (default: 'aptos-labs')
 * - repo: string (default: 'aptos-core')
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = (searchParams.get("owner") ?? "aptos-labs").trim();
  const repo = (searchParams.get("repo") ?? "aptos-core").trim();

  const isValidSegment = (value: string) => /^[A-Za-z0-9_.-]+$/.test(value);
  if (!isValidSegment(owner) || !isValidSegment(repo)) {
    return NextResponse.json(
      { error: "Invalid repo identifier", message: "owner and repo must be URL-safe segments" },
      { status: 400 },
    );
  }

  try {
    const upstreamUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const response = await fetch(upstreamUrl, {
      headers: {
        "Accept": "application/vnd.github+json",
        "User-Agent": "aptos-x402-composer",
      },
      // Avoid caching surprises in serverless
      cache: "no-store",
    });

    if (!response.ok) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      const reset = response.headers.get("x-ratelimit-reset");
      throw new Error(
        `GitHub API returned ${response.status} (rateLimitRemaining=${remaining ?? "unknown"}, reset=${reset ?? "unknown"})`,
      );
    }

    const data = await response.json();
    
    // Return user-friendly formatted response
    return NextResponse.json({
      repository: {
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        url: data.html_url,
        stars: data.stargazers_count,
        forks: data.forks_count,
        language: data.language || null, // GitHub's primary language (can be null)
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        owner: {
          login: data.owner?.login,
          avatar: data.owner?.avatar_url,
        },
        topics: data.topics || [],
        license: data.license?.name,
        openIssues: data.open_issues_count,
        defaultBranch: data.default_branch,
        // Include query params for reference
        _query: { owner, repo },
      },
      // Keep raw data for advanced use cases
      _raw: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch from GitHub",
        message: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}


