// ============================
// hermes — dashboard logic
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

// ---------- who's here? ----------
const rawUser = localStorage.getItem(USER_KEY);  // e.g. "yasiru42"
const token = localStorage.getItem(TOKEN_KEY);

if (!rawUser || !token) {
  // not logged in — bounce to login
  window.location.href = "index.html";
}

// strip trailing digits for the greeting: "yasiru42" -> "yasiru"
const displayName = rawUser.replace(/\d+$/, "") || rawUser;
document.getElementById("name").textContent = displayName;

// ---------- avatar (generated face) ----------
const avatarBtn = document.getElementById("avatar-btn");

// hash the username into a number
function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const h = hashString(rawUser);

// pastel palette — 10 colors
const pastels = [
  "#ffd1e8", "#ffc9c9", "#ffd8b0", "#fff3b0",
  "#d4f0c0", "#c0e8f0", "#c9d4ff", "#e0c9ff",
  "#ffc9ec", "#c9fff0"
];
const pastel = pastels[h % pastels.length];

// eye/mouth variants
const eyeStyles = ["•", "◕", "◉", "・", "^", "˘"];
const mouthStyles = ["‿", "ᵕ", "◡", "﹏", "ω", "3"];

const eye   = eyeStyles[(h >> 4) % eyeStyles.length];
const mouth = mouthStyles[(h >> 8) % mouthStyles.length];

// render the face inside the button
avatarBtn.innerHTML = `
  <span class="face" style="--face-bg:${pastel};">
    <span class="eyes">${eye} ${eye}</span>
    <span class="mouth">${mouth}</span>
  </span>
`;

// ---------- account menu ----------
const accountMenu = document.getElementById("account-menu");
avatarBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  accountMenu.hidden = !accountMenu.hidden;
});

document.addEventListener("click", () => {
  accountMenu.hidden = true;
});

accountMenu.addEventListener("click", (e) => e.stopPropagation());

// ---------- logout ----------
document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "index.html";
});

// ---------- watch videos gate ----------
const VIEWER_URL = "http://192.168.1.4:5000";
const PW_KEY = "receptionist_viewer_pw";
const SKIP_WARN_KEY = "receptionist_skip_lan_warning";

const watchTile = document.getElementById("watch-tile");
const modal = document.getElementById("watch-modal");
const pwInput = document.getElementById("viewer-pw");
const skipWarn = document.getElementById("skip-warn");
const modalMsg = document.getElementById("modal-msg");
const modalGo = document.getElementById("modal-go");
const modalCancel = document.getElementById("modal-cancel");

// preload saved state
const savedPw = localStorage.getItem(PW_KEY);
if (savedPw) pwInput.value = savedPw;
skipWarn.checked = localStorage.getItem(SKIP_WARN_KEY) === "1";

// hide the warning paragraph if user already opted out
function applyWarnVisibility() {
  const warnText = modal.querySelector(".modal-body");
  if (localStorage.getItem(SKIP_WARN_KEY) === "1") {
    warnText.style.display = "none";
  } else {
    warnText.style.display = "";
  }
}

watchTile.addEventListener("click", () => {
  applyWarnVisibility();
  modalMsg.textContent = "";
  modal.hidden = false;
  setTimeout(() => pwInput.focus(), 50);
});

modalCancel.addEventListener("click", () => {
  modal.hidden = true;
});

modalGo.addEventListener("click", async () => {
  const pw = pwInput.value.trim();
  if (!pw) {
    modalMsg.textContent = "enter the password";
    modalMsg.classList.add("error");
    return;
  }

  modalMsg.classList.remove("error");
  modalMsg.textContent = "checking...";

  try {
    const res = await fetch("/api/verify-viewer-pw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw })
    });
    const data = await res.json();

    if (!data.success) {
      modalMsg.textContent = data.error || "wrong password";
      modalMsg.classList.add("error");
      return;
    }

    // save password + skip preference
    localStorage.setItem(PW_KEY, pw);
    localStorage.setItem(SKIP_WARN_KEY, skipWarn.checked ? "1" : "0");

    modalMsg.textContent = "opening...";
    setTimeout(() => {
      window.location.href = VIEWER_URL;
    }, 400);
  } catch (err) {
    modalMsg.textContent = "could not reach server";
    modalMsg.classList.add("error");
  }
});

// close on escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) modal.hidden = true;
});

// click outside to close
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.hidden = true;
});