# Video URL Finder

![Manifest V3](https://img.shields.io/badge/Manifest-V3-4F46E5)
![Chrome](https://img.shields.io/badge/Chrome-supported-4F46E5)
![Edge](https://img.shields.io/badge/Edge-supported-4F46E5)
![License: MIT](https://img.shields.io/badge/License-MIT-4F46E5)

A Chrome/Edge browser extension that scans the current tab and lists every
direct video link it can find — `.mp4`, `.mkv`, `.webm`, `.avi`, `.mov`,
`.flv`, and more, plus streaming manifests (`.m3u8`, `.mpd`) — so you can
copy, open, or play them without digging through devtools.

## Features

- **Finds video links two ways**: scans the page's HTML/DOM *and* watches
  network requests, so it catches videos that only load once you hit play.
- **Dedupes intelligently**: the same file requested twice with a different
  signed token or cache-busting query string still collapses into one entry.
- **One-click actions** per link: copy, open in a new tab, or play instantly
  in [PotPlayer](https://potplayer.daum.net/) (Windows).
- **Clean, themeable UI**: Tailwind CSS, follows your system's light/dark
  mode automatically.
- **No tracking, no network calls of its own** — see [Privacy](#privacy).

## Install

Not yet published to the Chrome Web Store or Edge Add-ons, so installing
means loading it unpacked — either way below gets you the same thing.

### Option 1: Download the packaged release (recommended)

1. Go to the [latest release](https://github.com/mczainoo/video-url-finder/releases/latest)
   and download the `video-url-finder-vX.Y.Z.zip` asset.
2. Unzip it.
3. Go to `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
4. Turn on **Developer mode** (top-right toggle).
5. Click **Load unpacked** and select the unzipped folder.
6. Pin the extension, open any page with video, and click the icon.

### Option 2: From source

1. Clone this repo (or [download the source zip](../../archive/refs/heads/main.zip)) and unzip it.
2. Repeat steps 3-6 above, pointing **Load unpacked** at the project folder.

Use **Rescan** in the popup after a video starts playing — some players only
request the file once you hit play.

## How it finds URLs

- **Page scan** — checks every `<a>`, `<video>`, `<source>`, `<iframe>`,
  `<embed>`, `<track>` element's `href`/`src`/`data-*` attributes, and
  regex-scans the raw page HTML for anything else ending in a video extension.
- **Network capture** — a background listener watches the tab's network
  requests, so videos loaded dynamically (lazy-loaded players, XHR/fetch-based
  sources) show up too, even if they're not in the DOM.

Results reset each time the tab navigates to a new page, and are merged/deduped
when you open the popup.

## Privacy

This extension does not collect, transmit, or store any browsing data outside
your own machine — there's no analytics, no external server, and no network
requests made *by* the extension itself. The broad `host_permissions`
(`<all_urls>`) and `webRequest` permission exist purely so the background
script can watch the **current tab's own** network requests locally, to spot
video URLs; nothing is sent anywhere. All video links stay in memory for that
tab and are cleared on navigation or when the tab closes.

## Play in PotPlayer (fast playback, no in-tab download)

Each row has a play button that hands the URL straight to PotPlayer instead
of opening it in a browser tab, so PotPlayer streams it directly — faster
seeking/scrubbing on large files, no waiting on the browser's own player.

A browser extension can't launch a desktop `.exe` on its own (sandboxed by
design), so this relies on a one-time, per-machine setup that registers a
custom `potplayer://` URL protocol pointing at PotPlayer:

1. Open `tools/potplayer/register-potplayer-protocol.reg` and confirm the
   path inside matches where you cloned this project (and where PotPlayer is
   installed, inside `open-in-potplayer.ps1`, if it's not in the default
   `C:\Program Files\DAUM\PotPlayer\`).
2. Double-click the `.reg` file to import it (registers under
   `HKEY_CURRENT_USER`, so no admin prompt).
3. Click the play button in the popup. The first time, Chrome/Edge will ask
   to confirm launching an external app — check "Always allow" to skip that
   dialog on future clicks.

To undo: delete the `HKEY_CURRENT_USER\Software\Classes\potplayer` registry
key. This feature is Windows + PotPlayer specific; on other platforms the copy
and open-in-tab actions still work normally.

## Development

```sh
npm install       # once
npm run build:css # one-off Tailwind build
npm run watch:css # rebuild popup.css on save while iterating
```

The popup is styled with Tailwind CSS, precompiled to a static `popup.css` —
there's no CDN/runtime Tailwind, so it satisfies the extension's CSP and needs
no build step to *run*, only to edit. It follows the system light/dark theme
automatically (Tailwind's `dark:` variant, driven by `prefers-color-scheme`).

Icons are [Phosphor Icons](https://github.com/phosphor-icons/web), self-hosted
(no CDN, per the extension's CSP): `fonts/Phosphor.woff2` plus a trimmed
`phosphor.css` containing only the glyphs actually used (`ph-video`,
`ph-arrow-clockwise`, `ph-copy`, `ph-check`, `ph-warning-circle`,
`ph-magnifying-glass`, `ph-arrow-square-out`, `ph-play`). To add another icon,
look up its codepoint in
`node_modules/@phosphor-icons/web/src/regular/style.css` and add a matching
`.ph.ph-name:before { content: "..."; }` rule to `phosphor.css`.

## Packaging for distribution

```sh
npm run build
```

Rebuilds `popup.css`, then copies only the runtime files (no `node_modules`,
`src/`, `tools/`, `package.json`, or docs) into `dist/`, and zips it to
`video-url-finder-v<version>.zip` at the project root — `manifest.json` sits
at the zip's top level, ready to:

- **Upload to the Chrome Web Store / Microsoft Edge Add-ons** developer
  dashboard as-is, or
- **Share it** with someone else: they unzip it and use **Load unpacked** on
  the extracted folder.

There's no `.crx` step here on purpose: Chrome and Edge both stopped allowing
users to install a bare `.crx` by double-click/drag-and-drop years ago (it
only works if force-installed via Enterprise policy or listed on a store) —
so for a real "packed" install experience, the Web Store route above is the
one that actually matters. Bump `version` in `manifest.json` before rebuilding
for a new release.

## Files

- `manifest.json` — MV3 config, permissions.
- `background.js` — service worker; captures network requests, merges results.
- `content.js` — injected on demand to scan the page DOM/HTML.
- `common.js` — shared extension list/regex used by `background.js`.
- `popup.html/js` — the toolbar popup UI (list, copy, open, rescan).
- `popup.css` — **generated** by Tailwind from `src/input.css` — don't edit by hand.
- `src/input.css` — Tailwind entry point/custom scrollbar styling; edit this instead.
- `phosphor.css` / `fonts/Phosphor.woff2` — self-hosted Phosphor icon subset.
- `icons/` — toolbar icon.
- `tools/potplayer/` — one-time setup to enable "Play in PotPlayer" (see above).
- `tools/build.py` — packages a clean `dist/` + `.zip` for distribution (see above).
- `dist/`, `video-url-finder-v*.zip` — build output, gitignored, regenerate with `npm run build`.

## Contributing

Issues and pull requests are welcome — this is a small, single-purpose tool,
so please keep changes focused and consistent with the existing style.

## License

[MIT](LICENSE) © mczainoo
