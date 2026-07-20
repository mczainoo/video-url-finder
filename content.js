// Injected on demand via chrome.scripting.executeScript - runs once and its
// completion value (the array below) is returned to background.js.
(() => {
  const EXT = [
    "mp4", "m4v", "mkv", "webm", "avi", "mov", "wmv", "flv",
    "mpg", "mpeg", "3gp", "3g2", "ogv", "ts", "m2ts", "vob",
    "rm", "rmvb", "asf", "divx", "f4v", "mts",
    "m3u8", "mpd",
  ];
  const URL_RE = new RegExp(
    `https?:\\/\\/[^\\s"'<>\\)]+?\\.(${EXT.join("|")})(\\?[^\\s"'<>\\)]*)?(?=[\\s"'<>\\)]|$)`,
    "gi"
  );

  // Keyed by origin+pathname (not the full URL) so the same file requested
  // twice with a different query string - cache-busting params, signed
  // tokens that rotate per request - collapses into a single entry.
  const found = new Map();

  const addIfMatch = (value) => {
    if (!value) return;
    try {
      const parsed = new URL(value, document.baseURI);
      const ext = parsed.pathname.split(".").pop().toLowerCase();
      if (!EXT.includes(ext)) return;
      const key = `${parsed.origin}${parsed.pathname}`.toLowerCase();
      if (!found.has(key)) found.set(key, parsed.href);
    } catch {
      // ignore unparsable values
    }
  };

  // 1) Elements that commonly carry a media URL.
  const ATTRS = ["href", "src", "data-src", "data-url", "data-file", "data-video"];
  document.querySelectorAll("a, video, source, iframe, embed, track").forEach((el) => {
    for (const attr of ATTRS) addIfMatch(el.getAttribute(attr));
  });

  // 2) Anything else referencing a video URL in the raw HTML (inline JSON,
  //    player configs, etc.) that isn't sitting in a normal attribute.
  const html = document.documentElement.outerHTML;
  const matches = html.match(URL_RE) || [];
  matches.forEach(addIfMatch);

  return Array.from(found.values());
})();
