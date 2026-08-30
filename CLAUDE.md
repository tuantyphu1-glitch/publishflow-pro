# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

PublishFlow Pro is a single-file, static web app (`index.html`) — a Vietnamese-language dashboard mockup/prototype for creating, scheduling, and publishing video content across YouTube, TikTok, Facebook, and Instagram, plus a mock analytics view. There is no build system, package manager, bundler, framework, or test suite — everything (HTML, CSS, JS) lives inline in the one file.

## Development workflow

- **Run it**: open `index.html` directly in a browser, or serve it locally (e.g. `python3 -m http.server`) since the YouTube Google Sign-In script and the Facebook/YouTube API calls need to run from an `http(s)://` origin, not `file://`.
- **No build/lint/test commands exist.** There is no `package.json`, no linter config, and no test runner. Verify changes by loading the page in a browser and exercising the relevant flow manually (see "Manual verification" below).
- Edit in place: all styles are in the single `<style>` block, all markup in `<body>`, all behavior in the single trailing `<script>` block. Keep new code within this same-file structure rather than splitting into separate JS/CSS files unless asked to.

## Architecture

### Pages (client-side, no router)

The app is a single HTML document with one sidebar and five "pages," each a `<div class="page" id="page-*">` that's shown/hidden via `showPage(id)` (`index.html:899`) toggling the `.active` class — there's no URL routing.

- **Create** (`page-create`) — a 4-step wizard driven by `goStep(n)` (`index.html:989`): upload video/thumbnail → run mock AI optimization → per-platform preview → publish. Step panes are `#pane-1`..`#pane-4`; the stepper UI (`.step`, `.step-line`) tracks progress.
- **Schedule** (`page-schedule`) — calendar grid + upcoming list, rendered by `renderSchedule()` from the in-memory `scheduleData` array, plus a "Bulk Shorts" panel (`openBulk`/`autoSchedule`) for batch-scheduling shorts.
- **Library** (`page-library`) — searchable/filterable grid rendered by `renderLibrary()` from the in-memory `libData` array.
- **Analytics** (`page-analytics`) — charts/stats rendered by `renderAnalytics()`, also reading from `libData`.
- **Settings** (`page-settings`) — per-platform API connection UI and AI/publishing preferences.

### State model

All state is plain global JS variables and in-memory arrays reset on page load — there is no backend, database, or persistence layer beyond a few `localStorage` keys:
- `tags`, `platforms`, `videoType`, `aiData`, `currentStep`, `libFilter`, `libSearch`, `bulkFiles`, `videoFile`/`thumbFile` — session-only state.
- `scheduleData` and `libData` — hardcoded mock arrays standing in for a real content database.
- `localStorage` keys `fb_token`, `fb_page_id`, `yt_token` — the only data that survives a reload.

### Platform integrations

Two platforms have real API wiring; the other two are stubs:
- **YouTube**: real OAuth via Google Identity Services (`google.accounts.oauth2`, client ID hardcoded in `YT_CLIENT_ID` at `index.html:1095`) and a real resumable-free multipart upload to the YouTube Data API v3 in `uploadToYouTube()` (`index.html:1196`), including thumbnail upload.
- **Facebook**: real Graph API calls — `connectFacebook()` validates a manually entered Page Access Token + Page ID (`index.html:1115`), `uploadToFacebook()` posts video via `graph-video.facebook.com` (`index.html:1265`).
- **TikTok / Instagram**: UI-only stubs. `publish()` (`index.html:1325`) just displays "not supported / needs manual upload" for `tt`/`ig`.
- The "AI optimization" step (`runAI()`/`showAIResults()`, `index.html:1006`) is fully mocked — it fabricates per-platform titles/descriptions/hashtags client-side with a fake progress bar; it does not call Anthropic or any real API despite the Settings page showing an "Anthropic API Key" field.

### Conventions to preserve when editing

- UI copy and labels are in Vietnamese; keep new user-facing strings in Vietnamese unless told otherwise.
- Per-platform code consistently keys off the same four short codes: `yt`, `tt`, `fb`, `ig`. Follow this convention (e.g. `pl-<code>`, `sw-<code>`, `pub-status-<code>` element IDs) when adding platform-specific UI.
- Styling uses CSS custom properties defined on `:root` (`--bg`, `--accent`, `--green`, etc.) — reuse these variables rather than hardcoding new colors.
- Rendering is done via template-literal `innerHTML` assignment (no virtual DOM/framework) — follow the existing pattern of building an HTML string and assigning it to a container's `innerHTML`.

### Manual verification

Since there's no test suite, check changes by loading `index.html` in a browser and clicking through the affected page/step. Anything touching YouTube or Facebook publish flows requires real credentials (a Google OAuth client and a valid FB Page Access Token) to test end-to-end; without those, `uploadToYouTube()`/`connectFacebook()` will only exercise the error paths.
