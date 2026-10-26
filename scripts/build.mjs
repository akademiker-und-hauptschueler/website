/** Copyright (C) 2026 Der Akademiker und der Hauptschüler
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <https://www.gnu.org/licenses/>.
*
* Author: Der Akademiker und der Hauptschüler
*/

// Builds the static site into _site/:
// 1. copies docs/ (the hand-written site) unchanged,
// 2. renders every post in content/posts/<slug>/index.md to _site/blog/<slug>/index.html,
// 3. writes the blog overview _site/blog/index.html,
// 4. adds a "Hintergrund" link to the episode card of every published post.
//
// Drafts (draft: true) and posts dated in the future are skipped unless the
// script runs with --drafts (local preview only).

import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_SRC = path.join(ROOT, 'docs');
const POSTS_SRC = path.join(ROOT, 'content', 'posts');
const OUT = path.join(ROOT, '_site');
const BLOG_OUT = path.join(OUT, 'blog');
const INCLUDE_DRAFTS = process.argv.includes('--drafts');

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const formatDate = (date) => date.toLocaleDateString('de-DE', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});

const skipJunk = (src) => path.basename(src) !== '.DS_Store';

function extract(html, pattern, name) {
    const match = html.match(pattern);
    if (!match) throw new Error(`${name} not found in docs/index.html`);
    return match[0];
}

// Rewrites relative links of a fragment taken from docs/index.html so that it
// works from a page nested below the site root (root is e.g. "../../").
function rebase(fragment, root) {
    return fragment.replace(/(href|src)="(?![a-z]+:|\/)([^"]*)"/g, (_, attr, url) =>
        `${attr}="${root}${url.startsWith('#') ? `index.html${url}` : url}"`);
}

async function loadPosts() {
    let entries;
    try {
        entries = await readdir(POSTS_SRC, { withFileTypes: true });
    } catch (err) {
        if (err.code === 'ENOENT') return [];
        throw err;
    }

    const posts = [];
    for (const entry of entries.filter((e) => e.isDirectory())) {
        const slug = entry.name;
        if (!/^[a-z0-9-]+$/.test(slug)) {
            throw new Error(`Invalid post folder "${slug}": use lowercase letters, digits and dashes only`);
        }
        const file = path.join(POSTS_SRC, slug, 'index.md');
        const { data, content } = matter(await readFile(file, 'utf8'));

        for (const field of ['title', 'date', 'summary']) {
            if (!data[field]) throw new Error(`${file}: missing front matter field "${field}"`);
        }
        if (!(data.date instanceof Date)) throw new Error(`${file}: date must be YYYY-MM-DD`);
        if (!data.draft && !data.youtube) {
            throw new Error(`${file}: a published post needs the "youtube" link of the released episode`);
        }

        posts.push({ ...data, slug, content, draft: Boolean(data.draft) });
    }
    return posts.sort((a, b) => b.date - a.date);
}

function isVisible(post, now) {
    if (INCLUDE_DRAFTS) return true;
    return !post.draft && post.date <= now;
}

function renderMarkdown(markdown) {
    // External links open in a new tab, like everywhere else on the site.
    return marked.parse(markdown)
        .replace(/<a href="(https?:)/g, '<a target="_blank" rel="noopener" href="$1');
}

function layout({ title, description, root, body, shell }) {
    return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} – Der Akademiker und der Hauptschüler</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="stylesheet" href="${root}style.css">
    <link rel="stylesheet" href="${root}blog.css">
    ${shell.externalStyles.join('\n    ')}
</head>
<body class="blog-page">
    ${rebase(shell.header, root)}

    <main class="blog-main">
${body}
    </main>

    ${rebase(shell.footer, root)}

    <script src="${root}script.js"></script>
</body>
</html>
`;
}

function renderPost(post, shell) {
    const meta = [formatDate(post.date), post.episode ? `Folge ${escapeHtml(post.episode)}` : null]
        .filter(Boolean).join(' · ');
    const draftBanner = post.draft || post.date > new Date()
        ? '<p class="draft-banner">Entwurf – nur in der lokalen Vorschau sichtbar</p>\n'
        : '';
    const watch = post.youtube
        ? `<a class="btn btn-primary" href="${escapeHtml(post.youtube)}" target="_blank" rel="noopener"><i class="fab fa-youtube"></i> Folge ansehen</a>`
        : '';

    const body = `        <article class="post container">
            ${draftBanner}<header class="post-header">
                <p class="post-meta"><a href="../index.html">← Alle Beiträge</a> · ${meta}</p>
                <h1>${escapeHtml(post.title)}</h1>
                <p class="post-summary">${escapeHtml(post.summary)}</p>
                ${watch}
            </header>
            <div class="post-body">
${renderMarkdown(post.content)}
            </div>
        </article>`;

    return layout({ title: post.title, description: post.summary, root: '../../', body, shell });
}

function renderIndex(posts, shell) {
    const items = posts.length === 0
        ? '<p class="blog-empty">Hier erscheinen bald Hintergründe, Faktenchecks und Grafiken zu unseren Folgen.</p>'
        : posts.map((post) => `            <a class="blog-card" href="${post.slug}/index.html">
                <p class="post-meta">${formatDate(post.date)}${post.episode ? ` · Folge ${escapeHtml(post.episode)}` : ''}${post.draft ? ' · <span class="draft-tag">Entwurf</span>' : ''}</p>
                <h2>${escapeHtml(post.title)}</h2>
                <p>${escapeHtml(post.summary)}</p>
            </a>`).join('\n');

    const body = `        <section class="container blog-index">
            <h1>📝 Hintergründe zu den Folgen</h1>
            <p class="post-summary">Quellen, Faktenchecks und Grafiken, die in einer Folge keinen Platz hatten. Jeder Beitrag erscheint nach der Veröffentlichung der Folge.</p>
            <div class="blog-list">
${items}
            </div>
        </section>`;

    return layout({
        title: 'Blog',
        description: 'Hintergründe, Faktenchecks und Grafiken zu den Folgen des Podcasts.',
        root: '../',
        body,
        shell,
    });
}

// Adds a "Hintergrund" link next to "Ansehen" on the card of each post's episode.
function linkEpisodeCards(indexHtml, posts) {
    const byEpisode = new Map(posts.filter((p) => p.episode).map((p) => [Number(p.episode), p]));
    const marker = '<div class="episode-card">';
    const linked = new Set();

    const html = indexHtml.split(marker).map((chunk, i) => {
        if (i === 0) return chunk;
        const number = chunk.match(/<div class="episode-number">(\d+)<\/div>/);
        const post = number && byEpisode.get(Number(number[1]));
        if (!post) return chunk;

        const status = chunk.indexOf('<div class="episode-status">');
        const end = chunk.indexOf('</div>', status);
        if (status === -1 || end === -1) return chunk;
        linked.add(Number(number[1]));
        const link = `    <a href="blog/${post.slug}/index.html" class="episode-link"><i class="fas fa-book-open"></i> Hintergrund</a>
                        `;
        return chunk.slice(0, end) + link + chunk.slice(end);
    }).join(marker);

    for (const episode of byEpisode.keys()) {
        if (!linked.has(episode)) console.warn(`warning: no episode card ${episode} found in docs/index.html`);
    }
    return html;
}

async function main() {
    const indexHtml = await readFile(path.join(SITE_SRC, 'index.html'), 'utf8');
    const shell = {
        header: extract(indexHtml, /<header class="header">[\s\S]*?<\/header>/, 'header'),
        footer: extract(indexHtml, /<footer class="footer">[\s\S]*?<\/footer>/, 'footer'),
        externalStyles: indexHtml.match(/<link[^>]+href="https:[^"]+"[^>]*>/g) ?? [],
    };

    const now = new Date();
    const posts = (await loadPosts()).filter((post) => isVisible(post, now));

    await rm(OUT, { recursive: true, force: true });
    await cp(SITE_SRC, OUT, { recursive: true, filter: skipJunk });
    await mkdir(BLOG_OUT, { recursive: true });

    for (const post of posts) {
        const dir = path.join(BLOG_OUT, post.slug);
        await cp(path.join(POSTS_SRC, post.slug), dir, {
            recursive: true,
            filter: (src) => skipJunk(src) && path.basename(src) !== 'index.md',
        });
        await writeFile(path.join(dir, 'index.html'), renderPost(post, shell));
    }
    await writeFile(path.join(BLOG_OUT, 'index.html'), renderIndex(posts, shell));
    await writeFile(path.join(OUT, 'index.html'), linkEpisodeCards(indexHtml, posts));

    const drafts = posts.filter((p) => p.draft).length;
    console.log(`Built ${posts.length} post(s)${INCLUDE_DRAFTS ? ` incl. ${drafts} draft(s)` : ''} into ${path.relative(ROOT, OUT)}/`);
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
