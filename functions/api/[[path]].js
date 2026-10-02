// ==========================================
// receptionist — API
// file: functions/api/[[path]].js
// ==========================================

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS so the frontend can call us from any origin during dev
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Waiter-Secret",
    "Content-Type": "application/json"
  };

  // browsers send a preflight OPTIONS request before POST — answer it
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ----------------------------------------
    // ROUTE: POST /api/auth
    // register or log in
    // ----------------------------------------
    if (path === "/api/auth" && request.method === "POST") {
      const body = await request.json();
      const username = (body.username || "").toLowerCase().trim();
      const deviceToken = body.deviceToken || "";

      if (!username || !deviceToken) {
        return json({ success: false, error: "missing fields" }, 400, corsHeaders);
      }

      // look up user
      const existing = await env.DB
        .prepare("SELECT * FROM users WHERE username = ?")
        .bind(username)
        .first();

      if (!existing) {
        // new user — create them
        await env.DB
          .prepare("INSERT INTO users (username, device_token) VALUES (?, ?)")
          .bind(username, deviceToken)
          .run();

        return json({
          success: true,
          message: "account created",
          username
        }, 200, corsHeaders);
      }

      // existing user — overwrite the device token (kicks out any other browser)
      await env.DB
        .prepare("UPDATE users SET device_token = ? WHERE username = ?")
        .bind(deviceToken, username)
        .run();

      return json({
        success: true,
        message: "logged in",
        username
      }, 200, corsHeaders);
    }

    // ----------------------------------------
    // ROUTE: GET /api/me
    // returns the user's row if their token matches
    // ----------------------------------------
    if (path === "/api/me" && request.method === "GET") {
      const username = (url.searchParams.get("username") || "").toLowerCase();
      const deviceToken = url.searchParams.get("deviceToken") || "";

      const user = await env.DB
        .prepare("SELECT username, approved, created_at FROM users WHERE username = ? AND device_token = ?")
        .bind(username, deviceToken)
        .first();

      if (!user) {
        return json({ success: false, error: "unauthorized" }, 401, corsHeaders);
      }

      return json({ success: true, user }, 200, corsHeaders);
    }

    // ----------------------------------------
    // fallback
    // ----------------------------------------
    return json({ error: "not found", path }, 404, corsHeaders);

  } catch (err) {
    return json({ error: err.message }, 500, corsHeaders);
  }
}

// small helper so we don't repeat ourselves
function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers });
}