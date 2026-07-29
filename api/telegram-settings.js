import {
  readTelegramMiniAppSettings,
  storageConfigured,
  telegramConfigured,
  updateTelegramMiniAppSettings,
} from "../lib/telegram.js";

function initDataFromRequest(req) {
  return String(req.headers.authorization || "").replace(/^tma\s+/i, "").trim();
}

function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.json(payload);
}

export default async function handler(req, res) {
  if (!["GET", "PATCH"].includes(req.method)) {
    res.setHeader("Allow", "GET, PATCH");
    return json(res, 405, { error: "Method not allowed" });
  }
  if (!telegramConfigured() || !storageConfigured()) {
    return json(res, 503, { error: "Telegram settings are temporarily unavailable" });
  }
  const initData = initDataFromRequest(req);
  if (!initData) return json(res, 401, { error: "Telegram authorization required" });
  try {
    const settings = req.method === "PATCH"
      ? await updateTelegramMiniAppSettings(initData, req.body || {})
      : await readTelegramMiniAppSettings(initData);
    return json(res, 200, { ok: true, settings });
  } catch (error) {
    const status = error.status === 401 ? 401 : 500;
    return json(res, status, {
      error: status === 401
        ? "Telegram authorization expired. Please reopen the app from the bot."
        : "Telegram settings are temporarily unavailable",
    });
  }
}
