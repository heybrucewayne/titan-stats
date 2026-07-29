import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
process.env.UPSTASH_REDIS_REST_TOKEN = "redis-token";
process.env.TITAN_STATS_BASE_URL = "https://app.test";

const now = Date.now();
const titanData = {
  all: {
    epoch: "all",
    tokens: [{ symbol: "AAA", volume: 12000, board: [{ name: "alice", rank: 3, volume: 1200 }] }],
    grandVolume: 12000,
    grandTrades: 44,
    tokenCount: 1,
    generatedAt: now,
  },
  1: {
    epoch: 1,
    tokens: [{ symbol: "AAA", volume: 12000, board: [{ name: "alice", rank: 3, volume: 1200 }] }],
    grandVolume: 12000,
    grandTrades: 44,
    tokenCount: 1,
    generatedAt: now,
  },
  demo: {
    meta: {
      label: "Demo Campaign",
      symbol: "DMO",
      startTime: now - 3600000,
      endTime: now + 3600000,
      epochs: ["all", "1"],
      epochRanges: { 1: { startTime: now - 3600000, endTime: now + 3600000 } },
      campaignPool: 10000,
    },
    all: { volume: 9000, trades: 30, tokens: [], generatedAt: now },
    1: { volume: 9000, trades: 30, tokens: [], generatedAt: now },
  },
};

const kv = new Map();
const sets = new Map();
const telegramCalls = [];

function redisResult(command) {
  const [name, key, value, ...args] = command;
  if (name === "GET") return kv.get(key) ?? null;
  if (name === "SET") {
    if (args.includes("NX") && kv.has(key)) return null;
    kv.set(key, value);
    return "OK";
  }
  if (name === "DEL") return kv.delete(key) ? 1 : 0;
  if (name === "SADD") {
    const set = sets.get(key) || new Set();
    const before = set.size;
    set.add(String(value));
    sets.set(key, set);
    return set.size > before ? 1 : 0;
  }
  if (name === "SREM") return sets.get(key)?.delete(String(value)) ? 1 : 0;
  if (name === "SMEMBERS") return [...(sets.get(key) || [])];
  throw new Error(`Unsupported Redis command: ${name}`);
}

globalThis.fetch = async (url, options = {}) => {
  const href = String(url);
  if (href === "https://app.test/api/data") {
    return new Response(JSON.stringify(titanData), { status: 200 });
  }
  if (href === "https://redis.test") {
    const command = JSON.parse(options.body);
    return new Response(JSON.stringify({ result: redisResult(command) }), { status: 200 });
  }
  if (href === "https://redis.test/pipeline") {
    const commands = JSON.parse(options.body);
    return new Response(JSON.stringify(commands.map(command => ({ result: redisResult(command) }))), { status: 200 });
  }
  if (href.startsWith("https://api.telegram.org/bottest-token/")) {
    const method = href.split("/").at(-1);
    const body = JSON.parse(options.body || "{}");
    telegramCalls.push({ method, body });
    return new Response(JSON.stringify({ ok: true, result: { message_id: 99 } }), { status: 200 });
  }
  throw new Error(`Unexpected fetch: ${href}`);
};

const {
  handleTelegramUpdate,
  readTelegramMiniAppSettings,
  updateTelegramMiniAppSettings,
} = await import("../lib/telegram.js");

test("start renders a button-based live dashboard", async () => {
  await handleTelegramUpdate({
    update_id: 1,
    message: {
      message_id: 10,
      text: "/start",
      chat: { id: 42, type: "private" },
      from: { id: 42, language_code: "en" },
    },
  });
  const call = telegramCalls.find(item => item.method === "sendMessage");
  assert.match(call.body.text, /Titan Stats · Dashboard/);
  assert.equal(call.body.reply_markup.inline_keyboard.at(-1)[0].web_app.url, "https://app.test/?telegram=1&section=overview");
});

test("callback navigation answers immediately and edits the card", async () => {
  telegramCalls.length = 0;
  await handleTelegramUpdate({
    update_id: 2,
    callback_query: {
      id: "callback-1",
      data: "campaigns:0",
      from: { id: 42, language_code: "en" },
      message: { message_id: 99, chat: { id: 42, type: "private" } },
    },
  });
  assert.equal(telegramCalls[0].method, "answerCallbackQuery");
  const edit = telegramCalls.find(item => item.method === "editMessageText");
  assert.match(edit.body.text, /Demo Campaign/);
  assert.ok(edit.body.reply_markup.inline_keyboard.some(row => row[0].callback_data === "campaign:demo"));
});

test("alert toggles are persisted", async () => {
  telegramCalls.length = 0;
  await handleTelegramUpdate({
    update_id: 3,
    callback_query: {
      id: "callback-2",
      data: "alert:epochs",
      from: { id: 42, language_code: "en" },
      message: { message_id: 99, chat: { id: 42, type: "private" } },
    },
  });
  const stored = JSON.parse(kv.get("titan-stats:telegram:chat:42"));
  assert.equal(stored.alertTypes.epochs, false);
});

function miniAppInitData(userId) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: "query",
    user: JSON.stringify({ id: userId, language_code: "tr", first_name: "Test" }),
  });
  const checkString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update("test-token").digest();
  params.set("hash", createHmac("sha256", secret).update(checkString).digest("hex"));
  return params.toString();
}

test("Mini App settings use verified Telegram identity and sync both ways", async () => {
  const initData = miniAppInitData(77);
  const initial = await readTelegramMiniAppSettings(initData);
  assert.equal(initial.language, "tr");
  const updated = await updateTelegramMiniAppSettings(initData, {
    language: "en",
    follows: ["alice", "@bob", "alice"],
    alertTypes: { ranks: false },
  });
  assert.deepEqual(updated.follows, ["alice", "bob"]);
  assert.equal(updated.language, "en");
  assert.equal(updated.alertTypes.ranks, false);
});
