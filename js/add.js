// ============================
// hermes — add-a-link page
// ============================

const THEME_KEY = "receptionist_theme";
const TOKEN_KEY = "receptionist_token";
const USER_KEY  = "receptionist_user";

// ---------- theme ----------
const toggleBtn = document.getElementById("theme-toggle");
function applyTheme(mode) {
  if (mode === "boring") {
    document.body.classList.add("boring");
    toggleBtn.textContent = "boring";
  } else {
    document.body.classList.remove("boring");
    toggleBtn.textContent = "whimsical";
  }
}
applyTheme(localStorage.getItem(THEME_KEY) || "whimsical");
toggleBtn.addEventListener("click", () => {
  const next = document.body.classList.contains("boring") ? "whimsical" : "boring";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

// ---------- session ----------
const username = localStorage.getItem(USER_KEY);
const token = localStorage.getItem(TOKEN_KEY);
if (!username || !token) window.location.href = "index.html";

// ---------- mascot reacts to typing ----------
const urlInput = document.getElementById("url-input");
const mascot = document.querySelector(".mascot");

urlInput.addEventListener("input", () => {
  mascot.classList.toggle("excited", urlInput.value.length > 8);
});

// ---------- submit ----------
const form = document.getElementById("add-form");
const msg = document.getElementById("msg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();

  msg.textContent = "checking...";
  msg.classList.remove("error");

  try {
    const res = await fetch("/api/queue/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, deviceToken: token, url })
    });
    const data = await res.json();

    if (data.success) {
      msg.textContent = "queued ✨";
      urlInput.value = "";
      mascot.classList.add("happy");
      setTimeout(() => mascot.classList.remove("happy", "excited"), 900);
      loadQueue();
    } else {
      msg.textContent = data.error || "nope";
      msg.classList.add("error");
    }
  } catch (err) {
    msg.textContent = "couldn't reach hermes";
    msg.classList.add("error");
  }
});

// ---------- queue list ----------
async function loadQueue() {
  const res = await fetch(
    `/api/queue/mine?username=${encodeURIComponent(username)}&deviceToken=${encodeURIComponent(token)}`
  );
  const data = await res.json();
  if (!data.success) return;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const tonight = [];
  const older = [];

  for (const item of data.items) {
    const t = new Date(item.added_at + "Z").getTime();
    if (t >= startOfToday) tonight.push(item);
    else older.push(item);
  }

  renderList("tonight-list", tonight, "nothing yet — add something above");
  renderList("older-list", older, "no older links");
}

function renderList(listId, items, emptyText) {
  const ul = document.getElementById(listId);
  ul.innerHTML = "";

  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "queue-empty";
    li.textContent = emptyText;
    ul.appendChild(li);
    return;
  }

  for (const item of items) {
    const li = document.createElement("li");
    li.className = "queue-item";

    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.className = "queue-link";
    link.textContent = shortenUrl(item.url);
    li.appendChild(link);

    const badge = document.createElement("span");
    badge.className = "queue-status status-" + item.status;
    badge.textContent = item.status;
    li.appendChild(badge);

    ul.appendChild(li);
  }
}

function shortenUrl(u) {
  try {
    const p = new URL(u);
    if (p.hostname.includes("youtu.be")) return "youtu.be" + p.pathname;
    const v = p.searchParams.get("v");
    return v ? "youtube · " + v : p.hostname + p.pathname;
  } catch {
    return u;
  }
}

// ---------- older toggle ----------
const toggleOlder = document.getElementById("toggle-older");
const olderList = document.getElementById("older-list");
toggleOlder.addEventListener("click", () => {
  olderList.hidden = !olderList.hidden;
  toggleOlder.textContent = olderList.hidden ? "show older links ▾" : "hide older links ▴";
});

// ---------- go ----------
loadQueue();