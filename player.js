const titleEl = document.getElementById("title");
const errorEl = document.getElementById("error");
const videoEl = document.getElementById("player");

const url = new URLSearchParams(window.location.search).get("url") || "";

function filenameOf(videoUrl) {
  try {
    const { pathname } = new URL(videoUrl);
    return decodeURIComponent(pathname.split("/").pop() || videoUrl);
  } catch {
    return videoUrl;
  }
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function createPlyr(qualityOptions) {
  return new Plyr(videoEl, {
    iconUrl: "vendor/plyr/plyr.svg",
    ...(qualityOptions ? { quality: qualityOptions } : {}),
  });
}

// Safari plays HLS natively and doesn't expose per-level switching, so hls.js
// is only needed on Chromium/Firefox where <video> can't parse the manifest.
function playHls(hlsUrl) {
  if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
    videoEl.src = hlsUrl;
    createPlyr();
    return;
  }
  if (!window.Hls || !Hls.isSupported()) {
    showError("This browser can't play HLS streams.");
    return;
  }

  const hls = new Hls();
  hls.loadSource(hlsUrl);
  hls.attachMedia(videoEl);

  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (data.fatal) {
      showError("This stream failed to load — the manifest may be invalid, or the source blocks direct playback.");
    }
  });

  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    const levels = hls.levels
      .map((level, index) => ({ index, height: level.height }))
      .sort((a, b) => b.height - a.height);

    if (levels.length <= 1) {
      createPlyr();
      return;
    }

    const player = createPlyr({
      default: levels[0].height,
      options: levels.map((level) => level.height),
      onChange: (height) => {
        const match = levels.find((level) => level.height === height);
        if (match) hls.currentLevel = match.index;
      },
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      const height = hls.levels[data.level]?.height;
      if (height && player.quality !== height) player.quality = height;
    });
  });
}

function playDash(mpdUrl) {
  if (!window.dashjs) {
    showError("This browser can't play DASH streams.");
    return;
  }

  const dash = dashjs.MediaPlayer().create();
  dash.initialize(videoEl, mpdUrl, false);

  dash.on(dashjs.MediaPlayer.events.ERROR, () => {
    showError("This stream failed to load — the manifest may be invalid, or the source blocks direct playback.");
  });

  dash.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
    const representations = dash.getRepresentationsByType("video").slice().sort((a, b) => b.height - a.height);
    const heights = [...new Set(representations.map((rep) => rep.height))];

    if (heights.length <= 1) {
      createPlyr();
      return;
    }

    const player = createPlyr({
      default: heights[0],
      options: heights,
      onChange: (height) => {
        const match = representations.find((rep) => rep.height === height);
        if (match) dash.setRepresentationForTypeById("video", match.id, true);
      },
    });

    dash.on(dashjs.MediaPlayer.events.REPRESENTATION_SWITCH, (event) => {
      if (event.mediaType !== "video") return;
      const height = event.currentRepresentation?.height;
      if (height && player.quality !== height) player.quality = height;
    });
  });
}

if (!url) {
  showError("No video URL was given to play.");
} else {
  titleEl.textContent = filenameOf(url);
  document.title = `${filenameOf(url)} — Video URL Finder`;

  videoEl.addEventListener("error", () => {
    showError("This browser couldn't play the video — the format may be unsupported, or the source may block direct playback.");
  });

  const ext = extensionOf(url);
  if (ext === "m3u8") {
    playHls(url);
  } else if (ext === "mpd") {
    playDash(url);
  } else {
    videoEl.src = url;
    createPlyr();
  }
}
