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