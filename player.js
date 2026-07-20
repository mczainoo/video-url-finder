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

if (!url) {
  showError("No video URL was given to play.");
} else {
  titleEl.textContent = filenameOf(url);
  document.title = `${filenameOf(url)} — Video URL Finder`;

  videoEl.src = url;
  videoEl.addEventListener("error", () => {
    showError("This browser couldn't play the video — the format may be unsupported, or the source may block direct playback.");
  });

  new Plyr(videoEl, { iconUrl: "vendor/plyr/plyr.svg" });
}
