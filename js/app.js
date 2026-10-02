// ============================
// receptionist — client logic
// ============================

const THEME_KEY = "receptionist_theme";
const TOKEN_KEY = "receptionist_token";
const USER_KEY  = "receptionist_user";

// ---------- theme ----------
const toggleBtn = document.getElementById("theme-toggle");

function applyTheme(mode) {
  // mode: "whimsical" | "boring"
  if (mode === "boring") {
    document.body.classList.add("boring");
    toggleBtn.textContent = "boring";
  } else {
    document.body.classList.remove("boring");
    toggleBtn.textContent = "whimsical";
  }
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "whimsical";
  applyTheme(saved);
}

toggleBtn.addEventListener("click", () => {
  const isBoring = document.body.classList.contains("boring");
  const next = isBoring ? "whimsical" : "boring";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

// ---------- auto-redirect if already logged in ----------
function checkExistingSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const user  = localStorage.getItem(USER_KEY);

  if (token && user) {
    // We'll verify this token against the server later.
    // For now, trust it and bounce to dashboard.
    window.location.href = "dashboard.html";
  }
}

// ---------- login form ----------
const form     = document.getElementById("login-form");
const namePart = document.getElementById("name-part");
const numPart  = document.getElementById("num-part");
const message  = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = namePart.value.trim().toLowerCase();
  const num  = numPart.value.trim();

  // basic validation
  if (!name) {
    showMessage("need a name", true);
    return;
  }
  if (!/^[a-z0-9]+$/.test(name)) {
    showMessage("letters and numbers only", true);
    return;
  }
  if (!/^\d{2}$/.test(num)) {
    showMessage("need exactly 2 digits", true);
    return;
  }

  const username = name + num;

  // generate or reuse device token
  let deviceToken = localStorage.getItem(TOKEN_KEY);
  if (!deviceToken) {
    deviceToken = crypto.randomUUID();
  }

  showMessage("checking...", false);

  try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, deviceToken })
    });

    const data = await res.json();

    if (data.success) {
      localStorage.setItem(TOKEN_KEY, deviceToken);
      localStorage.setItem(USER_KEY, username);
      showMessage("welcome, " + username, false);
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 400);
    } else {
      showMessage(data.error || "nope", true);
    }
  } catch (err) {
    // no backend yet — this is expected locally
    showMessage("no server yet — pretend success", true);

    // fake it so we can still see the flow work:
    // uncomment these two lines to test the redirect without a backend
    // localStorage.setItem(TOKEN_KEY, deviceToken);
    // localStorage.setItem(USER_KEY, username);
  }
});

function showMessage(text, isError) {
  message.textContent = text;
  message.classList.toggle("error", !!isError);
}

// ---------- go ----------
loadTheme();
checkExistingSession();