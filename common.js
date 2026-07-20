// Shared constants used by background.js, content.js and popup.js.
// Kept in one place so the extension/streaming-format list never drifts between them.

const VIDEO_EXTENSIONS = [
  "mp4", "m4v", "mkv", "webm", "avi", "mov", "wmv", "flv",
  "mpg", "mpeg", "3gp", "3g2", "ogv", "ts", "m2ts", "vob",
  "rm", "rmvb", "asf", "divx", "f4v", "mts"
];

// Streaming manifests: not a single video file, but the entry point to one.
const STREAM_EXTENSIONS = ["m3u8", "mpd"];

const ALL_EXTENSIONS = [...VIDEO_EXTENSIONS, ...STREAM_EXTENSIONS];

const VIDEO_URL_REGEX = new RegExp(
  `https?:\\/\\/[^\\s"'<>\\)]+?\\.(${ALL_EXTENSIONS.join("|")})(\\?[^\\s"'<>\\)]*)?(?=[\\s"'<>\\)]|$)`,
  "gi"
);

function extensionOf(url) {
  try {
    const path = new URL(url).pathname;
    const match = path.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : "";
  } catch {
    return "";
  }
}

function isVideoUrl(url) {
  const ext = extensionOf(url);
  return ALL_EXTENSIONS.includes(ext);
}

// Same file requested twice (e.g. a signed CDN URL whose auth token/expiry
// changes per request, or a cache-busting query param) should collapse into
// one entry. The path already carries the extension we matched on, so two
// genuinely different videos never share an origin+pathname.
function dedupeKey(url) {
  try {
    const { origin, pathname } = new URL(url);
    return `${origin}${pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

if (typeof module !== "undefined") {
  module.exports = {
    VIDEO_EXTENSIONS,
    STREAM_EXTENSIONS,
    ALL_EXTENSIONS,
    VIDEO_URL_REGEX,
    extensionOf,
    isVideoUrl,
    dedupeKey,
  };
}
