const STREAM_EXTENSIONS = new Set(["m3u8", "mpd"]);

const BADGE_CLASSES = {
  file: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  stream: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
};

const listEl = document.getElementById("list");
const countEl = document.getElementById("count");
const statusEl = document.getElementById("status");
const copyAllBtn = document.getElementById("copyAll");
const rescanBtn = document.getElementById("rescan");
const rescanIcon = document.getElementById("rescanIcon");
const itemTemplate = document.getElementById("itemTemplate");

const COPY_ICON = '<i class="ph ph-copy text-sm leading-none"></i>';
const CHECK_ICON = '<i class="ph ph-check text-sm leading-none text-emerald-500"></i>';

let currentVideos = [];

function statusIcon(name) {
  return `<i class="ph ${name} text-3xl text-slate-300 dark:text-slate-600"></i>`;
}

function showStatus(html) {
  statusEl.innerHTML = html;
  statusEl.style.display = html ? "flex" : "none";
}

function render(videos) {
  currentVideos = videos;
  listEl.innerHTML = "";

  if (videos.length === 0) {
    listEl.classList.add("hidden");
  } else {
    listEl.classList.remove("hidden");
    videos.forEach((video) => {
      const node = itemTemplate.content.cloneNode(true);
      const isStream = STREAM_EXTENSIONS.has(video.ext);

      const extEl = node.querySelector(".ext");
      extEl.textContent = video.ext;
      extEl.className = `ext shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        BADGE_CLASSES[isStream ? "stream" : "file"]
      }`;

      const link = node.querySelector(".url");
      link.href = video.url;
      link.title = video.url;
      link.querySelector(".urlText").textContent = video.url;

      const playTabBtn = node.querySelector(".playTabBtn");
      playTabBtn.addEventListener("click", () => playInNewTab(video.url));

      const playBtn = node.querySelector(".playBtn");
      playBtn.addEventListener("click", () => playInPotPlayer(video.url));

      const copyBtn = node.querySelector(".copyBtn");
      copyBtn.addEventListener("click", () => copyText(video.url, copyBtn));

      listEl.appendChild(node);
    });
  }

  countEl.textContent = `${videos.length} link${videos.length === 1 ? "" : "s"} found`;
  copyAllBtn.disabled = videos.length === 0;
}

function playInNewTab(url) {
  chrome.tabs.create({ url: `${chrome.runtime.getURL("player.html")}?url=${encodeURIComponent(url)}` });
}

function playInPotPlayer(url) {
  // Requires the one-time "potplayer://" protocol registration in
  // tools/potplayer/ - the browser hands this off to the OS, which launches
  // PotPlayer directly on the URL instead of downloading/streaming in-tab.
  window.location.href = `potplayer://${url}`;
}

async function copyText(text, triggerBtn) {
  try {
    await navigator.clipboard.writeText(text);
    if (triggerBtn) flashCopied(triggerBtn);
  } catch {
    showStatus(`${statusIcon("ph-warning-circle")}<span>Couldn't access the clipboard.</span>`);
  }
}

function flashCopied(btn) {
  btn.innerHTML = CHECK_ICON;
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = COPY_ICON;
    btn.disabled = false;
  }, 1200);
}

copyAllBtn.addEventListener("click", () => {
  copyText(currentVideos.map((v) => v.url).join("\n"), null);
  const original = copyAllBtn.innerHTML;
  copyAllBtn.innerHTML = `${CHECK_ICON} Copied!`;
  setTimeout(() => (copyAllBtn.innerHTML = original), 1200);
});

rescanBtn.addEventListener("click", scan);

async function scan() {
  rescanIcon.classList.add("animate-spin");
  showStatus("");
  countEl.textContent = "Scanning…";
  copyAllBtn.disabled = true;
  listEl.innerHTML = "";
  listEl.classList.add("hidden");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    rescanIcon.classList.remove("animate-spin");
    countEl.textContent = "0 links found";
    showStatus(`${statusIcon("ph-warning-circle")}<span>No active tab.</span>`);
    return;
  }

  chrome.runtime.sendMessage({ type: "GET_VIDEOS", tabId: tab.id }, (response) => {
    rescanIcon.classList.remove("animate-spin");

    if (chrome.runtime.lastError) {
      countEl.textContent = "0 links found";
      showStatus(`${statusIcon("ph-warning-circle")}<span>${chrome.runtime.lastError.message}</span>`);
      return;
    }

    const videos = response?.videos || [];
    render(videos);

    if (videos.length === 0) {
      showStatus(
        `${statusIcon("ph-magnifying-glass")}` +
          `<span>No video links found on this page yet.<br/>If a player is on screen, try playing it, then rescan.</span>`
      );
    } else {
      showStatus("");
    }
  });
}

scan();
