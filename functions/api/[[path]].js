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
    // ROUTE: POST /api/queue/add
    // add a youtube link to the queue
    // ----------------------------------------
    if (path === "/api/queue/add" && request.method === "POST") {
      const body = await request.json();
      const username = (body.username || "").toLowerCase().trim();
      const deviceToken = body.deviceToken || "";
      const ytUrl = (body.url || "").trim();

      if (!username || !deviceToken || !ytUrl) {
        return json({ success: false, error: "missing fields" }, 400, corsHeaders);
      }

      // strict youtube check
      if (!/^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|m\.youtube\.com\/watch\?v=)[\w-]+/i.test(ytUrl)) {
        return json({ success: false, error: "that's not a youtube link" }, 400, corsHeaders);
      }

      // verify device token
      const user = await env.DB
        .prepare("SELECT * FROM users WHERE username = ? AND device_token = ?")
        .bind(username, deviceToken)
        .first();

      if (!user) {
        return json({ success: false, error: "not logged in" }, 403, corsHeaders);
      }

      await env.DB
        .prepare("INSERT INTO queue (username, url) VALUES (?, ?)")
        .bind(username, ytUrl)
        .run();

      return json({ success: true, message: "queued for tonight" }, 200, corsHeaders);
    }

    // ----------------------------------------
    // ROUTE: GET /api/queue/mine
    // returns this user's queue, newest first
    // ----------------------------------------
    if (path === "/api/queue/mine" && request.method === "GET") {
      const username = (url.searchParams.get("username") || "").toLowerCase();
      const deviceToken = url.searchParams.get("deviceToken") || "";

      const user = await env.DB
        .prepare("SELECT * FROM users WHERE username = ? AND device_token = ?")
        .bind(username, deviceToken)
        .first();

      if (!user) {
        return json({ success: false, error: "not logged in" }, 403, corsHeaders);
      }

      const { results } = await env.DB
        .prepare("SELECT id, url, status, added_at FROM queue WHERE username = ? ORDER BY added_at DESC")
        .bind(username)
        .all();

      return json({ success: true, items: results }, 200, corsHeaders);
    }

         // ----------------------------------------
    // ROUTE: GET /api/queue/pending
    // waiter-only — fetches everything waiting
    // ----------------------------------------
    if (path === "/api/queue/pending" && request.method === "GET") {
      const waiterSecret = request.headers.get("X-Waiter-Secret");
      if (!waiterSecret || waiterSecret !== env.WAITER_SECRET) {
        return json({ success: false, error: "forbidden" }, 403, corsHeaders);
      }

      const { results } = await env.DB
        .prepare("SELECT id, username, url, added_at FROM queue WHERE status = 'pending' ORDER BY added_at ASC")
        .all();

      return json({ success: true, items: results }, 200, corsHeaders);
    }

    // ----------------------------------------
    // ROUTE: POST /api/queue/complete
    // waiter-only — marks one item done or failed
    // ----------------------------------------
    if (path === "/api/queue/complete" && request.method === "POST") {
      const waiterSecret = request.headers.get("X-Waiter-Secret");
      if (!waiterSecret || waiterSecret !== env.WAITER_SECRET) {
        return json({ success: false, error: "forbidden" }, 403, corsHeaders);
      }

      const body = await request.json();
      const id = body.id;
      const status = body.status === "failed" ? "failed" : "completed";

      if (!id) {
        return json({ success: false, error: "missing id" }, 400, corsHeaders);
      }

      await env.DB
        .prepare("UPDATE queue SET status = ?, downloaded_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(status, id)
        .run();

      return json({ success: true, id, status }, 200, corsHeaders);
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