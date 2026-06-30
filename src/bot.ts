import { AtpAgent } from '@atproto/api';
import dotenv from 'dotenv';
import { randomInt } from 'node:crypto';
// import { serve } from '@hono/node-server'
// import { Hono } from 'hono'

import lines from './lines.js';

const INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
// let interval: NodeJS.Timeout | null = null;

dotenv.config();
// Initialize the agent
const agent = new AtpAgent({ service: 'https://bsky.social' });

// // Health endpoint stuff
// const app = new Hono()
// const PORT = Number(process.env.PORT) || 3000

// app.get('/health', (c) => {
//   return c.json({ status: 'ok', timestamp: new Date().toISOString() })
// })

// serve({
//   fetch: app.fetch,
//   port: PORT,
// }, (info) => {
//   console.warn(`Server running on port ${info.port}`)
//   console.warn(`Health check available at http://localhost:${info.port}/health`)
// })

// process.on('SIGTERM', () => {
//   console.warn('SIGTERM received, shutting down gracefully...')
//   process.exit(0)
// })

// process.on('SIGINT', () => {
//   console.warn('SIGINT received, shutting down gracefully...')
//   process.exit(0)
// })

/**
 * Login to Bluesky
 */
async function login(): Promise<void> {
    const username = process.env.BSKY_HANDLE;
    const password = process.env.BSKY_PASSWORD;

    if (!username || !password) {
        throw new Error('Missing BSKY_HANDLE or BSKY_PASSWORD');
    }

    await agent.login({
        identifier: username,
        password: password,
    });

    console.log('Bot logged in successfully');
}

/**
 * Post a message with RichText (handles @mentions, #hashtags, and links)
 */
async function postMessage(): Promise<void> {
    // RichText automatically detects and creates facets for:
    // - @mentions (links to user profiles)
    // - #hashtags (searchable tags)
    // - URLs (clickable links)
    const text = lines[randomInt(lines.length)];
    console.log('No posts detected. Sending text:');
    console.log(text);
    await agent.post({
        text
    });
}

async function searchAndRepostContent () {
    const last_trawl_ms = new Date(new Date().valueOf() - INTERVAL_MS);
    //  Have to query separately, as for some reason hashtag makes it exclusive or something
    const processedCids: string[] = [];
    const searchParamsHashtag: QueryParams = {
        q: '#MarineTheRaccoon', // gives quite a few posts
        limit: 10,
        since: last_trawl_ms.toISOString(),  // "2026-06-30T00:55:08.099Z" 
    }
    const searchParams: QueryParams = {
        q: '"Marine the Raccoon"', //  gives 8 posts
        limit: 10,
        since: last_trawl_ms.toISOString(),  // "2026-06-30T00:55:08.099Z" 
    }

    const resultsTerm = await agent.app.bsky.feed.searchPosts(searchParams);
    const resultsHashtag = await agent.app.bsky.feed.searchPosts(searchParamsHashtag);
    // console.log("XXXXXXXXXX");

    for(const postList of [resultsTerm?.data?.posts, resultsHashtag?.data?.posts]){
        for(const post of postList){
            if(!processedCids.includes(post.cid)){
                await agent.repost(post.uri, post.cid);
                // console.log('NEW POST:');
                // console.log(post?.record?.text);
                processedCids.push(post.cid);
            }
        }
    }
    console.log(`Reposted ${processedCids.length} posts!`);

    // If no posts, post a random Marine line from SR:A.
    if(processedCids.length = 0){
        postMessage();
    }
}

/**
 * Main function
 */
async function main() {
    await login();

    await searchAndRepostContent();
    // interval = setInterval(() => {
    //     searchAndRepostContent().catch(console.error);
    // }, INTERVAL_MS);
}

main();
// main().catch(console.error);

export type QueryParams = {
    /** Search query string; syntax, phrase, boolean, and faceting is unspecified, but Lucene query syntax is recommended. */
    q: string;
    /** Specifies the ranking order of results. */
    sort?: 'top' | 'latest' | (string & {});
    /** Filter results for posts after the indicated datetime (inclusive). Expected to use 'sortAt' timestamp, which may not match 'createdAt'. Can be a datetime, or just an ISO date (YYYY-MM-DD). */
    since?: string;
    /** Filter results for posts before the indicated datetime (not inclusive). Expected to use 'sortAt' timestamp, which may not match 'createdAt'. Can be a datetime, or just an ISO date (YYY-MM-DD). */
    until?: string;
    /** Filter to posts which mention the given account. Handles are resolved to DID before query-time. Only matches rich-text facet mentions. */
    mentions?: string;
    /** Filter to posts by the given account. Handles are resolved to DID before query-time. */
    author?: string;
    /** Filter to posts in the given language. Expected to be based on post language field, though server may override language detection. */
    lang?: string;
    /** Filter to posts with URLs (facet links or embeds) linking to the given domain (hostname). Server may apply hostname normalization. */
    domain?: string;
    /** Filter to posts with links (facet links or embeds) pointing to this URL. Server may apply URL normalization or fuzzy matching. */
    url?: string;
    /** Filter to posts with the given tag (hashtag), based on rich-text facet or tag field. Do not include the hash (#) prefix. Multiple tags can be specified, with 'AND' matching. */
    tag?: string[];
    limit?: number;
    /** Optional pagination mechanism; may not necessarily allow scrolling through entire result set. */
    cursor?: string;
};

type QueryParamsV2 = {
    /** Optional pagination cursor. */
    cursor?: string;
    /** Maximum number of results to return. */
    limit?: number;
    /** Search query string. A query or at least one filter is required. */
    query?: string;
    /** Ranking order for results. 'recent' sorts by recency; 'top' uses search ranking. */
    sort?: 'recent' | 'top' | (string & {});
    /** Include posts by any of these authors. Handles are resolved to DIDs before searching. */
    authors?: string[];
    /** Include posts that mention any of these accounts. Handles are resolved to DIDs before searching. */
    mentions?: string[];
    /** Include posts that link to any of these domains. */
    domains?: string[];
    /** Include posts that link to any of these URLs. */
    urls?: string[];
    /** Include posts that embed any of these AT URIs. */
    embeddedAtUris?: string[];
    /** Include posts tagged with any of these hashtags. Do not include the hash (#) prefix. */
    hashtags?: string[];
    /** Exclude posts by any of these authors. Handles are resolved to DIDs before searching. */
    excludeAuthors?: string[];
    /** Exclude posts that mention any of these accounts. Handles are resolved to DIDs before searching. */
    excludeMentions?: string[];
    /** Exclude posts that link to any of these domains. */
    excludeDomains?: string[];
    /** Exclude posts that link to any of these URLs. */
    excludeUrls?: string[];
    /** Exclude posts that embed any of these AT URIs. */
    excludeEmbeddedAtUris?: string[];
    /** Exclude posts tagged with any of these hashtags. Do not include the hash (#) prefix. */
    excludeHashtags?: string[];
    /** Include posts indexed at or after this timestamp. Can be a datetime, or just an ISO date (YYYY-MM-DD). */
    since?: string;
    /** Include posts indexed before this timestamp. Defaults to the current time. Can be a datetime, or just an ISO date (YYYY-MM-DD). */
    until?: string;
    /** Search the full index instead of the recent-post window. */
    allTime?: boolean;
    /** Include posts whose language matches any of these language codes. */
    languages?: string[];
    /** Exclude posts whose language matches any of these language codes. */
    excludeLanguages?: string[];
    /** Include only posts with media. */
    hasMedia?: boolean;
    /** Include only posts with video. */
    hasVideo?: boolean;
    /** Include only direct replies to this parent post URI. */
    replyParentUri?: string;
    /** Include only posts in the thread rooted at this post URI. */
    threadRootUri?: string;
    /** Exclude replies from results. Mutually exclusive with repliesOnly. */
    excludeReplies?: boolean;
    /** Include only replies. Mutually exclusive with excludeReplies. */
    repliesOnly?: boolean;
    /** Include only posts from accounts followed by the viewer. */
    following?: boolean;
    /** Language analyzer hint for the query text. If unset, the server auto-detects when possible. */
    queryLanguage?: 'ja' | 'zh' | 'ko' | 'th' | 'ar' | (string & {});
};