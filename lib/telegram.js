import { createHash, createHmac, timingSafeEqual, webcrypto } from "node:crypto";

const TELEGRAM_API = "https://api.telegram.org";
const DEFAULT_APP_URL = "https://titan-stats.vercel.app";
const REDIS_PREFIX = "titan-stats:telegram";
const MAX_FOLLOWS = 8;
const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_OIDC_AUDIENCE = "titan-stats-telegram";
const GITHUB_REPOSITORY = "uzaylilarsolanakullaniyor/titan-stats";
const GITHUB_WORKFLOW = ".github/workflows/titan-automation.yml";

const TEXT = {
  en: {
    welcome: "Welcome to Titan Stats Bot. I track campaigns, epochs, wallets and live data health.\n\nUse /help to see all commands.",
    help: "Titan Stats commands\n\n/campaigns — active campaigns\n/campaign <name> — campaign details\n/epoch — latest PreStocks epoch\n/epoch 2 — a specific epoch\n/wallet <username> — wallet/user volume\n/follow <username> — follow a user\n/unfollow <username> — stop following\n/following — followed users\n/alerts on|off — notifications\n/lang en|tr — language\n/status — data health",
    usageWallet: "Usage: /wallet username",
    usageCampaign: "Usage: /campaign campaign-name",
    usageFollow: "Usage: /follow username",
    usageUnfollow: "Usage: /unfollow username",
    noCampaigns: "No active or upcoming campaigns were found.",
    noCampaign: "Campaign not found.",
    noEpoch: "Epoch data was not found.",
    noWallet: "This user is not visible in the top-100 leaderboards for the selected epoch.",
    storageUnavailable: "Personal tracking is being activated. Public commands are available now; please try this command again shortly.",
    genericError: "The data service is temporarily unavailable. Please try again shortly.",
    followed: name => `Following ${name}. You will be notified about meaningful ranking changes.`,
    alreadyFollowed: name => `${name} is already followed.`,
    unfollowed: name => `Stopped following ${name}.`,
    notFollowed: name => `${name} is not in your follow list.`,
    followingNone: "You are not following anyone yet.",
    followingTitle: "Followed users",
    followLimit: `You can follow up to ${MAX_FOLLOWS} users.`,
    alertsOn: "Campaign, epoch and followed-user alerts are on.",
    alertsOff: "Alerts are off. Commands will keep working.",
    alertsUsage: "Usage: /alerts on or /alerts off",
    languageSet: "Language changed to English.",
    languageUsage: "Usage: /lang en or /lang tr",
    live: "Live",
    upcoming: "Upcoming",
    ended: "Ended",
    startsIn: "starts",
    endsIn: "ends",
    totalVolume: "Total volume",
    totalTrades: "Total trades",
    tokens: "Tokens",
    latestEpoch: "Latest PreStocks epoch",
    dataFresh: "Live data",
    dataAge: "Data age",
    source: "Source",
    rank: "rank",
    volume: "volume",
    walletTitle: name => `Wallet/user: ${name}`,
    campaignStarted: name => `🚀 ${name} has started.`,
    campaignEnded: name => `🏁 ${name} has ended.`,
    campaignDiscovered: name => `🆕 New campaign: ${name}.`,
    epochChanged: (name, previous, current) => `⏱ ${name}: Epoch ${previous} ended, Epoch ${current} started.`,
    prestockEpoch: epoch => `⏱ PreStocks Epoch ${epoch} is now live.`,
    rankImproved: (name, before, after) => `📈 ${name} improved from rank #${before} to #${after}.`,
    rankDropped: (name, before, after) => `📉 ${name} moved from rank #${before} to #${after}.`,
    notificationTitle: "Titan Stats update",
  },
  tr: {
    welcome: "Titan Stats Bot'a hoş geldin. Kampanyaları, epoch'ları, kullanıcı hacimlerini ve canlı veri sağlığını takip ederim.\n\nTüm komutlar için /help yaz.",
    help: "Titan Stats komutları\n\n/campaigns — aktif kampanyalar\n/campaign <isim> — kampanya detayı\n/epoch — son PreStocks epoch'u\n/epoch 2 — belirli bir epoch\n/wallet <kullanıcı> — hacim ve sıralama\n/follow <kullanıcı> — kullanıcıyı takip et\n/unfollow <kullanıcı> — takibi bırak\n/following — takip edilenler\n/alerts on|off — bildirimler\n/lang en|tr — dil\n/status — veri sağlığı",
    usageWallet: "Kullanım: /wallet kullanıcı_adı",
    usageCampaign: "Kullanım: /campaign kampanya-adı",
    usageFollow: "Kullanım: /follow kullanıcı_adı",
    usageUnfollow: "Kullanım: /unfollow kullanıcı_adı",
    noCampaigns: "Aktif veya yaklaşan kampanya bulunamadı.",
    noCampaign: "Kampanya bulunamadı.",
    noEpoch: "Epoch verisi bulunamadı.",
    noWallet: "Bu kullanıcı seçili epoch'un ilk 100 sıralamalarında görünmüyor.",
    storageUnavailable: "Kişisel takip sistemi etkinleştiriliyor. Genel komutlar şu anda çalışıyor; bu komutu kısa süre sonra tekrar dene.",
    genericError: "Veri servisine geçici olarak ulaşılamıyor. Biraz sonra tekrar dene.",
    followed: name => `${name} takip ediliyor. Önemli sıralama değişikliklerinde bildirim alacaksın.`,
    alreadyFollowed: name => `${name} zaten takip ediliyor.`,
    unfollowed: name => `${name} takibi bırakıldı.`,
    notFollowed: name => `${name} takip listende değil.`,
    followingNone: "Henüz kimseyi takip etmiyorsun.",
    followingTitle: "Takip edilen kullanıcılar",
    followLimit: `En fazla ${MAX_FOLLOWS} kullanıcı takip edebilirsin.`,
    alertsOn: "Kampanya, epoch ve takip edilen kullanıcı bildirimleri açık.",
    alertsOff: "Bildirimler kapalı. Komutlar çalışmaya devam edecek.",
    alertsUsage: "Kullanım: /alerts on veya /alerts off",
    languageSet: "Dil Türkçe olarak değiştirildi.",
    languageUsage: "Kullanım: /lang en veya /lang tr",
    live: "Canlı",
    upcoming: "Yaklaşıyor",
    ended: "Bitti",
    startsIn: "başlangıç",
    endsIn: "bitiş",
    totalVolume: "Toplam hacim",
    totalTrades: "Toplam işlem",
    tokens: "Token",
    latestEpoch: "Son PreStocks epoch'u",
    dataFresh: "Canlı veri",
    dataAge: "Veri yaşı",
    source: "Kaynak",
    rank: "sıra",
    volume: "hacim",
    walletTitle: name => `Cüzdan/kullanıcı: ${name}`,
    campaignStarted: name => `🚀 ${name} başladı.`,
    campaignEnded: name => `🏁 ${name} sona erdi.`,
    campaignDiscovered: name => `🆕 Yeni kampanya: ${name}.`,
    epochChanged: (name, previous, current) => `⏱ ${name}: Epoch ${previous} bitti, Epoch ${current} başladı.`,
    prestockEpoch: epoch => `⏱ PreStocks Epoch ${epoch} başladı.`,
    rankImproved: (name, before, after) => `📈 ${name} #${before} sırasından #${after} sırasına yükseldi.`,
    rankDropped: (name, before, after) => `📉 ${name} #${before} sırasından #${after} sırasına geriledi.`,
    notificationTitle: "Titan Stats güncellemesi",
  },
};

const UI = {
  en: {
    dashboard: "Dashboard",
    chooseAction: "Choose an action below.",
    activeCampaigns: "Active campaigns",
    currentEpoch: "Current epoch",
    followedUsers: "Followed users",
    alerts: "Alerts",
    on: "ON",
    off: "OFF",
    campaigns: "Campaigns",
    epoch: "Epoch",
    myStats: "My stats",
    following: "Following",
    calculator: "Calculator",
    alertSettings: "Alert settings",
    dataHealth: "Data health",
    language: "Language",
    openDashboard: "Open dashboard",
    back: "Back",
    refresh: "Refresh",
    details: "Details",
    addUser: "Add user",
    remove: "Remove",
    allCampaigns: "All campaign",
    campaignAlerts: "Campaign alerts",
    epochAlerts: "Epoch alerts",
    rankAlerts: "Rank alerts",
    globalAlerts: "All notifications",
    followPrompt: "Reply with a Titan username or wallet address to follow.",
    walletPrompt: "Reply with a Titan username or wallet address to view its stats.",
    inputPlaceholder: "Username or wallet address",
    noFollowed: "No users are followed yet.",
    settingsSaved: "Settings saved",
    page: "Page",
    topTokens: "Top tokens",
    updated: "Updated",
  },
  tr: {
    dashboard: "Ana Panel",
    chooseAction: "Aşağıdan bir işlem seç.",
    activeCampaigns: "Aktif kampanya",
    currentEpoch: "Güncel epoch",
    followedUsers: "Takip edilen",
    alerts: "Bildirimler",
    on: "AÇIK",
    off: "KAPALI",
    campaigns: "Kampanyalar",
    epoch: "Epoch",
    myStats: "İstatistiklerim",
    following: "Takip Listem",
    calculator: "Hesaplayıcı",
    alertSettings: "Bildirim ayarları",
    dataHealth: "Veri sağlığı",
    language: "Dil",
    openDashboard: "Paneli Aç",
    back: "Geri",
    refresh: "Yenile",
    details: "Detay",
    addUser: "Kullanıcı ekle",
    remove: "Kaldır",
    allCampaigns: "Tüm kampanya",
    campaignAlerts: "Kampanya bildirimleri",
    epochAlerts: "Epoch bildirimleri",
    rankAlerts: "Sıralama bildirimleri",
    globalAlerts: "Tüm bildirimler",
    followPrompt: "Takip etmek istediğin Titan kullanıcı adını veya cüzdan adresini yanıt olarak gönder.",
    walletPrompt: "İstatistiklerini görmek istediğin Titan kullanıcı adını veya cüzdan adresini yanıt olarak gönder.",
    inputPlaceholder: "Kullanıcı adı veya cüzdan adresi",
    noFollowed: "Henüz takip edilen kullanıcı yok.",
    settingsSaved: "Ayarlar kaydedildi",
    page: "Sayfa",
    topTokens: "Lider tokenlar",
    updated: "Güncellendi",
  },
};

function telegramToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

export function telegramConfigured() {
  return Boolean(telegramToken());
}

function redisCredentials() {
  const knownPairs = [
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
    ["STORAGE_REST_API_URL", "STORAGE_REST_API_TOKEN"],
    ["STORAGE_REST_URL", "STORAGE_REST_TOKEN"],
    ["STORAGE_URL", "STORAGE_TOKEN"],
  ];
  for (const [urlKey, tokenKey] of knownPairs) {
    if (process.env[urlKey] && process.env[tokenKey]) {
      return { url: process.env[urlKey], token: process.env[tokenKey] };
    }
  }

  // Vercel Marketplace lets users choose any prefix (for example STORAGE).
  // Pair the injected Upstash URL with the closest writable token so custom
  // prefixes keep working without asking users to duplicate secrets manually.
  const entries = Object.entries(process.env);
  const urls = entries.filter(([key, value]) =>
    /(UPSTASH|REDIS|STORAGE)/i.test(key) && /URL$/i.test(key) && /^https:\/\//i.test(value || "")
  );
  const tokens = entries.filter(([key, value]) =>
    /(UPSTASH|REDIS|STORAGE)/i.test(key) && /TOKEN$/i.test(key) && !/READ_ONLY/i.test(key) && Boolean(value)
  );
  for (const [urlKey, url] of urls) {
    const prefix = urlKey.split(/_(?:REDIS_)?(?:REST_API_|REST_)?URL$/i)[0];
    const match = tokens.find(([tokenKey]) => tokenKey.startsWith(`${prefix}_`));
    if (match) return { url, token: match[1] };
  }
  return { url: "", token: "" };
}

function redisUrl() {
  return redisCredentials().url;
}

function redisToken() {
  return redisCredentials().token;
}

export function storageConfigured() {
  return Boolean(redisUrl() && redisToken());
}

function appUrl() {
  return String(process.env.TITAN_STATS_BASE_URL || DEFAULT_APP_URL).replace(/\/$/, "");
}

function webhookUrl() {
  return String(process.env.TELEGRAM_WEBHOOK_URL || `${appUrl()}/api/telegram`);
}

export function webhookSecret() {
  const token = telegramToken();
  return token
    ? createHash("sha256").update(`titan-stats:${token}`).digest("base64url").slice(0, 64)
    : "";
}

export function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

async function telegramCall(method, body = {}) {
  const token = telegramToken();
  if (!token) throw new Error("Telegram is not configured");
  const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.description || `Telegram ${method} failed`);
    error.status = response.status;
    error.code = payload.error_code;
    throw error;
  }
  return payload.result;
}

function telegramOptions(options = {}) {
  const allowed = [
    "reply_markup",
    "parse_mode",
    "disable_notification",
    "protect_content",
    "reply_parameters",
  ];
  return Object.fromEntries(
    Object.entries(options).filter(([key, value]) => allowed.includes(key) && value != null)
  );
}

export async function sendTelegramMessage(chatId, text, options = {}) {
  return telegramCall("sendMessage", {
    chat_id: chatId,
    text: String(text).slice(0, 4096),
    disable_web_page_preview: true,
    ...telegramOptions(options),
  });
}

async function editTelegramMessage(chatId, messageId, text, options = {}) {
  try {
    return await telegramCall("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: String(text).slice(0, 4096),
      disable_web_page_preview: true,
      ...telegramOptions(options),
    });
  } catch (error) {
    if (String(error.message).toLowerCase().includes("message is not modified")) return null;
    throw error;
  }
}

async function answerCallbackQuery(callbackQueryId, text = "") {
  return telegramCall("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text: String(text).slice(0, 200) } : {}),
  });
}

async function redisCommand(...command) {
  if (!storageConfigured()) throw new Error("Storage is not configured");
  const response = await fetch(redisUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(payload.error || "Redis request failed");
  return payload.result;
}

async function redisPipeline(commands) {
  if (!storageConfigured()) throw new Error("Storage is not configured");
  const response = await fetch(`${redisUrl().replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  const payload = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(payload)) throw new Error("Redis pipeline failed");
  const failed = payload.find(item => item?.error);
  if (failed) throw new Error(failed.error);
  return payload.map(item => item.result);
}

const chatKey = chatId => `${REDIS_PREFIX}:chat:${chatId}`;
const chatsKey = `${REDIS_PREFIX}:chats`;
const stateKey = `${REDIS_PREFIX}:campaign-state`;
const updateKey = updateId => `${REDIS_PREFIX}:update:${updateId}`;

function parseJson(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

async function getChat(chatId) {
  if (!storageConfigured()) return null;
  return parseJson(await redisCommand("GET", chatKey(chatId)), null);
}

async function saveChat(settings) {
  if (!storageConfigured()) return false;
  settings.updatedAt = Date.now();
  await redisPipeline([
    ["SET", chatKey(settings.chatId), JSON.stringify(settings)],
    ["SADD", chatsKey, String(settings.chatId)],
  ]);
  return true;
}

async function deleteChat(chatId) {
  if (!storageConfigured()) return;
  await redisPipeline([
    ["DEL", chatKey(chatId)],
    ["SREM", chatsKey, String(chatId)],
  ]);
}

async function allChats() {
  if (!storageConfigured()) return [];
  const ids = await redisCommand("SMEMBERS", chatsKey) || [];
  if (!ids.length) return [];
  const rows = await redisPipeline(ids.map(id => ["GET", chatKey(id)]));
  return rows.map(row => parseJson(row, null)).filter(Boolean);
}

async function acceptUpdate(updateId) {
  if (!storageConfigured() || updateId == null) return true;
  return (await redisCommand("SET", updateKey(updateId), "1", "NX", "EX", 86400)) === "OK";
}

function normalizeLanguage(value) {
  return String(value || "").toLowerCase().startsWith("tr") ? "tr" : "en";
}

function initialSettings(message) {
  const chatId = String(message.chat.id);
  return {
    chatId,
    chatType: message.chat.type || "private",
    language: normalizeLanguage(message.from?.language_code),
    alerts: true,
    alertTypes: { campaigns: true, epochs: true, ranks: true },
    follows: [],
    walletState: {},
    pendingAction: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function normalizeSettings(settings) {
  if (!settings) return null;
  return {
    ...settings,
    chatId: String(settings.chatId),
    language: normalizeLanguage(settings.language),
    alerts: settings.alerts !== false,
    alertTypes: {
      campaigns: settings.alertTypes?.campaigns !== false,
      epochs: settings.alertTypes?.epochs !== false,
      ranks: settings.alertTypes?.ranks !== false,
    },
    follows: Array.isArray(settings.follows)
      ? settings.follows.map(value => String(value).replace(/^@/, "").trim()).filter(Boolean).slice(0, MAX_FOLLOWS)
      : [],
    walletState: settings.walletState && typeof settings.walletState === "object" ? settings.walletState : {},
    pendingAction: settings.pendingAction || null,
  };
}

async function getOrCreateSettings(message) {
  const existing = await getChat(message.chat.id);
  return normalizeSettings(existing || initialSettings(message));
}

export async function fetchTitanData() {
  const response = await fetch(`${appUrl()}/api/data`, {
    headers: { Accept: "application/json", "User-Agent": "Titan-Stats-Telegram/1.0" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.all?.tokens) throw new Error(payload.error || "Titan data unavailable");
  return payload;
}

function numericEpochs(data) {
  return Object.keys(data || {})
    .filter(key => /^\d+$/.test(key) && Array.isArray(data[key]?.tokens))
    .map(Number)
    .sort((a, b) => a - b);
}

function latestEpochKey(data) {
  const epochs = numericEpochs(data);
  return epochs.length ? String(epochs.at(-1)) : "all";
}

function campaignEntries(data) {
  return Object.entries(data || {}).filter(([key, value]) =>
    key !== "all" && !/^\d+$/.test(key) && value?.meta && value?.all
  );
}

function timestampMs(value) {
  const number = Number(value) || 0;
  return number > 1e12 ? number : number * 1000;
}

function campaignStatus(meta, now = Date.now()) {
  const start = timestampMs(meta?.startTime);
  const end = timestampMs(meta?.endTime);
  if (start && now < start) return "upcoming";
  if (end && now >= end) return "ended";
  return "live";
}

function activeCampaignEpoch(meta, now = Date.now()) {
  const ranges = meta?.epochRanges || {};
  const active = Object.entries(ranges).find(([key, range]) => {
    if (!/^\d+$/.test(key)) return false;
    const start = timestampMs(range?.startTime);
    const end = timestampMs(range?.endTime);
    return (!start || now >= start) && (!end || now < end);
  });
  if (active) return active[0];
  const epochs = (meta?.epochs || []).filter(value => /^\d+$/.test(String(value))).map(Number);
  return epochs.length ? String(Math.max(...epochs)) : "all";
}

function formatCurrency(value, language) {
  return new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatNumber(value, language) {
  return new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDuration(target, language) {
  const seconds = Math.max(0, Math.round((target - Date.now()) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (language === "tr") {
    if (days) return `${days}g ${hours}sa`;
    if (hours) return `${hours}sa ${minutes}dk`;
    return `${minutes}dk`;
  }
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function campaignLabel(slug, meta) {
  return meta?.label || slug.replace(/[-_]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function findCampaign(data, query) {
  const normalized = String(query || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  return campaignEntries(data).find(([slug, value]) => {
    const candidates = [slug, value.meta?.label, value.meta?.symbol]
      .map(item => String(item || "").toLowerCase().replace(/[^a-z0-9]+/g, ""));
    return candidates.some(candidate => candidate === normalized || candidate.includes(normalized));
  });
}

function findBoardRow(board, query) {
  let wanted = String(query || "").trim().replace(/^@/, "").toLowerCase();
  if (!wanted) return null;
  const exact = (board || []).find(row => String(row.name || "").toLowerCase() === wanted);
  if (exact) return exact;
  const short = wanted.length >= 8 ? `${wanted.slice(0, 4)}...${wanted.slice(-4)}` : "";
  return short ? (board || []).find(row => String(row.name || "").toLowerCase() === short) || null : null;
}

function walletMetrics(data, epochKey, query) {
  const epoch = data?.[epochKey] || data?.all;
  const matches = (epoch?.tokens || []).map(token => {
    const row = findBoardRow(token.board || token.top || [], query);
    return row ? { symbol: token.symbol || token.name || "?", rank: Number(row.rank) || 0, volume: Number(row.volume) || 0 } : null;
  }).filter(Boolean).sort((a, b) => b.volume - a.volume);
  return {
    matches,
    totalVolume: matches.reduce((sum, row) => sum + row.volume, 0),
    bestRank: matches.length ? Math.min(...matches.map(row => row.rank).filter(Boolean)) : null,
  };
}

function campaignListText(data, language) {
  const words = TEXT[language];
  const now = Date.now();
  const visible = campaignEntries(data)
    .map(([slug, value]) => ({ slug, value, status: campaignStatus(value.meta, now) }))
    .filter(item => item.status !== "ended" || now - timestampMs(item.value.meta.endTime) < 7 * 86400000)
    .sort((a, b) => {
      const order = { live: 0, upcoming: 1, ended: 2 };
      return order[a.status] - order[b.status] || timestampMs(a.value.meta.endTime) - timestampMs(b.value.meta.endTime);
    });
  if (!visible.length) return words.noCampaigns;
  const lines = visible.map(({ slug, value, status }) => {
    const meta = value.meta;
    const label = campaignLabel(slug, meta);
    const statusLabel = status === "live" ? words.live : status === "upcoming" ? words.upcoming : words.ended;
    const target = status === "upcoming" ? timestampMs(meta.startTime) : timestampMs(meta.endTime);
    const remaining = target && target > now ? ` · ${status === "upcoming" ? words.startsIn : words.endsIn}: ${formatDuration(target, language)}` : "";
    return `• ${label} — ${statusLabel}${remaining}`;
  });
  return `${language === "tr" ? "Kampanyalar" : "Campaigns"}\n\n${lines.join("\n")}`;
}

function campaignDetailText(data, query, language) {
  const match = findCampaign(data, query);
  if (!match) return TEXT[language].noCampaign;
  const [slug, campaign] = match;
  const words = TEXT[language];
  const meta = campaign.meta;
  const status = campaignStatus(meta);
  const epoch = activeCampaignEpoch(meta);
  const payload = campaign[epoch] || campaign.all;
  const statusLabel = status === "live" ? words.live : status === "upcoming" ? words.upcoming : words.ended;
  const lines = [
    campaignLabel(slug, meta),
    `${language === "tr" ? "Durum" : "Status"}: ${statusLabel}`,
    `Epoch: ${epoch === "all" ? "—" : epoch}`,
    `${words.totalVolume}: ${formatCurrency(payload?.volume, language)}`,
    `${words.totalTrades}: ${formatNumber(payload?.trades, language)}`,
  ];
  if (Number(meta.campaignPool)) lines.push(`${language === "tr" ? "Ödül havuzu" : "Reward pool"}: ${formatCurrency(meta.campaignPool, language)}`);
  const end = timestampMs(meta.endTime);
  if (status === "live" && end) lines.push(`${words.endsIn}: ${formatDuration(end, language)}`);
  return lines.join("\n");
}

function epochText(data, requested, language) {
  const words = TEXT[language];
  const key = requested === "all" ? "all" : requested && /^\d+$/.test(requested) ? requested : latestEpochKey(data);
  const payload = data?.[key];
  if (!payload?.tokens) return words.noEpoch;
  return [
    key === "all" ? "PreStocks — All campaign" : `${words.latestEpoch}: ${key}`,
    `${words.totalVolume}: ${formatCurrency(payload.grandVolume, language)}`,
    `${words.totalTrades}: ${formatNumber(payload.grandTrades, language)}`,
    `${words.tokens}: ${formatNumber(payload.tokenCount, language)}`,
  ].join("\n");
}

function walletText(data, query, language) {
  const words = TEXT[language];
  const key = latestEpochKey(data);
  const metrics = walletMetrics(data, key, query);
  if (!metrics.matches.length) return words.noWallet;
  const rows = metrics.matches.slice(0, 6).map(row =>
    `• ${row.symbol}: #${row.rank} · ${formatCurrency(row.volume, language)}`
  );
  return [
    words.walletTitle(query),
    `Epoch ${key}`,
    `${words.totalVolume}: ${formatCurrency(metrics.totalVolume, language)}`,
    "",
    ...rows,
  ].join("\n");
}

function statusText(data, language) {
  const words = TEXT[language];
  const generatedAt = Number(data?.all?.generatedAt) || 0;
  const ageMinutes = generatedAt ? Math.max(0, Math.floor((Date.now() - generatedAt) / 60000)) : null;
  const age = ageMinutes == null ? "—" : language === "tr" ? `${ageMinutes} dk` : `${ageMinutes} min`;
  return [
    `Titan Stats — ${words.dataFresh}`,
    `${words.dataAge}: ${age}`,
    `${words.tokens}: ${formatNumber(data?.all?.tokenCount, language)}`,
    `${words.source}: titan-stats.vercel.app`,
  ].join("\n");
}

function visibleCampaigns(data) {
  const now = Date.now();
  const order = { live: 0, upcoming: 1, ended: 2 };
  return campaignEntries(data)
    .map(([slug, value]) => ({ slug, value, status: campaignStatus(value.meta, now) }))
    .filter(item => item.status !== "ended" || now - timestampMs(item.value.meta.endTime) < 7 * 86400000)
    .sort((a, b) =>
      order[a.status] - order[b.status] ||
      timestampMs(a.value.meta.endTime || a.value.meta.startTime) -
        timestampMs(b.value.meta.endTime || b.value.meta.startTime)
    );
}

function miniAppButton(text, section, chatType = "private") {
  const url = `${appUrl()}/?telegram=1${section ? `&section=${encodeURIComponent(section)}` : ""}`;
  return chatType === "private" ? { text, web_app: { url } } : { text, url };
}

function backRow(language) {
  return [{ text: `← ${UI[language].back}`, callback_data: "home" }];
}

function dashboardView(data, settings) {
  const language = settings.language;
  const ui = UI[language];
  const generatedAt = Number(data?.all?.generatedAt) || 0;
  const ageMinutes = generatedAt ? Math.max(0, Math.floor((Date.now() - generatedAt) / 60000)) : null;
  const active = visibleCampaigns(data).filter(item => item.status === "live").length;
  const text = [
    `📊 Titan Stats · ${ui.dashboard}`,
    "",
    `🟢 ${TEXT[language].dataFresh}${ageMinutes == null ? "" : ` · ${ageMinutes} ${language === "tr" ? "dk" : "min"}`}`,
    `🚀 ${ui.activeCampaigns}: ${active}`,
    `⏱ ${ui.currentEpoch}: ${latestEpochKey(data)}`,
    `👥 ${ui.followedUsers}: ${settings.follows.length}`,
    `🔔 ${ui.alerts}: ${settings.alerts ? ui.on : ui.off}`,
    "",
    ui.chooseAction,
  ].join("\n");
  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [
          { text: `🚀 ${ui.campaigns}`, callback_data: "campaigns:0" },
          { text: `⏱ ${ui.epoch}`, callback_data: `epoch:${latestEpochKey(data)}` },
        ],
        [
          { text: `📊 ${ui.myStats}`, callback_data: "stats:add" },
          { text: `👥 ${ui.following}`, callback_data: "following" },
        ],
        [
          miniAppButton(`🎯 ${ui.calculator}`, "calculator", settings.chatType),
          { text: `🔔 ${ui.alertSettings}`, callback_data: "alerts" },
        ],
        [
          { text: `🩺 ${ui.dataHealth}`, callback_data: "health" },
          { text: `🌐 ${ui.language}`, callback_data: "language" },
        ],
        [miniAppButton(`↗️ ${ui.openDashboard}`, "overview", settings.chatType)],
      ],
    },
  };
}

function campaignListView(data, settings, requestedPage = 0) {
  const language = settings.language;
  const ui = UI[language];
  const words = TEXT[language];
  const campaigns = visibleCampaigns(data);
  const pageSize = 4;
  const pages = Math.max(1, Math.ceil(campaigns.length / pageSize));
  const page = Math.min(Math.max(0, Number(requestedPage) || 0), pages - 1);
  const rows = campaigns.slice(page * pageSize, (page + 1) * pageSize);
  const statusIcon = { live: "🟢", upcoming: "🟡", ended: "⚫️" };
  const text = campaigns.length
    ? [
        `🚀 ${ui.campaigns} · ${ui.page} ${page + 1}/${pages}`,
        "",
        ...rows.map(({ slug, value, status }) => {
          const target = status === "upcoming"
            ? timestampMs(value.meta.startTime)
            : timestampMs(value.meta.endTime);
          const remaining = target > Date.now()
            ? ` · ${formatDuration(target, language)}`
            : "";
          const label = status === "live" ? words.live : status === "upcoming" ? words.upcoming : words.ended;
          return `${statusIcon[status]} ${campaignLabel(slug, value.meta)} — ${label}${remaining}`;
        }),
      ].join("\n")
    : words.noCampaigns;
  const detailRows = rows.map(({ slug, value }) => [
    { text: `${campaignLabel(slug, value.meta)} · ${ui.details}`, callback_data: `campaign:${slug}` },
  ]);
  const paging = [];
  if (page > 0) paging.push({ text: "←", callback_data: `campaigns:${page - 1}` });
  if (page < pages - 1) paging.push({ text: "→", callback_data: `campaigns:${page + 1}` });
  return {
    text,
    reply_markup: {
      inline_keyboard: [
        ...detailRows,
        ...(paging.length ? [paging] : []),
        [miniAppButton(`↗️ ${ui.allCampaigns}`, "campaigns", settings.chatType)],
        backRow(language),
      ],
    },
  };
}

function campaignDetailView(data, settings, slug) {
  const language = settings.language;
  const ui = UI[language];
  const match = findCampaign(data, slug);
  return {
    text: match ? campaignDetailText(data, match[0], language) : TEXT[language].noCampaign,
    reply_markup: {
      inline_keyboard: [
        [miniAppButton(`🎯 ${ui.calculator}`, `calculator-${match?.[0] || ""}`, settings.chatType)],
        [{ text: `← ${ui.campaigns}`, callback_data: "campaigns:0" }],
        backRow(language),
      ],
    },
  };
}

function epochView(data, settings, requested) {
  const language = settings.language;
  const ui = UI[language];
  const epochs = numericEpochs(data);
  let key = requested === "all" ? "all" : String(requested || latestEpochKey(data));
  if (key !== "all" && !epochs.includes(Number(key))) key = latestEpochKey(data);
  const payload = data?.[key] || data?.all;
  const leaders = [...(payload?.tokens || [])]
    .sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0))
    .slice(0, 5);
  const index = key === "all" ? -1 : epochs.indexOf(Number(key));
  const rows = [
    epochText(data, key, language),
    "",
    `${ui.topTokens}:`,
    ...(leaders.length
      ? leaders.map((token, position) =>
          `${position + 1}. ${token.symbol || token.name || "?"} · ${formatCurrency(token.volume, language)}`
        )
      : ["—"]),
  ];
  const paging = [];
  if (index > 0) paging.push({ text: `← Epoch ${epochs[index - 1]}`, callback_data: `epoch:${epochs[index - 1]}` });
  if (index >= 0 && index < epochs.length - 1) {
    paging.push({ text: `Epoch ${epochs[index + 1]} →`, callback_data: `epoch:${epochs[index + 1]}` });
  }
  return {
    text: rows.join("\n"),
    reply_markup: {
      inline_keyboard: [
        ...(paging.length ? [paging] : []),
        [{ text: `Σ ${ui.allCampaigns}`, callback_data: "epoch:all" }],
        [miniAppButton(`↗️ ${ui.openDashboard}`, "epoch", settings.chatType)],
        backRow(language),
      ],
    },
  };
}

function followingView(settings) {
  const language = settings.language;
  const ui = UI[language];
  const text = settings.follows.length
    ? [`👥 ${ui.following}`, "", ...settings.follows.map((name, index) => `${index + 1}. ${name}`)].join("\n")
    : `👥 ${ui.following}\n\n${ui.noFollowed}`;
  const removeRows = settings.follows.map((name, index) => [
    { text: `✕ ${name}`, callback_data: `follow:remove:${index}` },
  ]);
  return {
    text,
    reply_markup: {
      inline_keyboard: [
        ...removeRows,
        [{ text: `＋ ${ui.addUser}`, callback_data: "follow:add" }],
        [miniAppButton(`↗️ ${ui.openDashboard}`, "users", settings.chatType)],
        backRow(language),
      ],
    },
  };
}

function alertSettingsView(settings) {
  const language = settings.language;
  const ui = UI[language];
  const mark = enabled => enabled ? "✅" : "⬜️";
  return {
    text: [
      `🔔 ${ui.alertSettings}`,
      "",
      `${mark(settings.alerts)} ${ui.globalAlerts}`,
      `${mark(settings.alertTypes.campaigns)} ${ui.campaignAlerts}`,
      `${mark(settings.alertTypes.epochs)} ${ui.epochAlerts}`,
      `${mark(settings.alertTypes.ranks)} ${ui.rankAlerts}`,
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [
        [{ text: `${mark(settings.alerts)} ${ui.globalAlerts}`, callback_data: "alert:all" }],
        [
          { text: `${mark(settings.alertTypes.campaigns)} ${ui.campaigns}`, callback_data: "alert:campaigns" },
          { text: `${mark(settings.alertTypes.epochs)} ${ui.epoch}`, callback_data: "alert:epochs" },
        ],
        [{ text: `${mark(settings.alertTypes.ranks)} ${ui.following}`, callback_data: "alert:ranks" }],
        backRow(language),
      ],
    },
  };
}

function languageView(settings) {
  const language = settings.language;
  return {
    text: `🌐 ${UI[language].language}\n\nEnglish / Türkçe`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: `${language === "en" ? "✅ " : ""}English`, callback_data: "language:en" },
          { text: `${language === "tr" ? "✅ " : ""}Türkçe`, callback_data: "language:tr" },
        ],
        backRow(language),
      ],
    },
  };
}

async function sendPrompt(message, settings, action) {
  const language = settings.language;
  const isFollow = action === "follow";
  settings.pendingAction = action;
  if (storageConfigured()) await saveChat(settings);
  return sendTelegramMessage(
    message.chat.id,
    isFollow ? UI[language].followPrompt : UI[language].walletPrompt,
    {
      reply_markup: {
        force_reply: true,
        selective: true,
        input_field_placeholder: UI[language].inputPlaceholder,
      },
    }
  );
}

async function handlePendingInput(message, settings) {
  const language = settings.language;
  const words = TEXT[language];
  const clean = String(message.text || "").replace(/^@/, "").trim().slice(0, 80);
  const action = settings.pendingAction;
  settings.pendingAction = null;
  if (!clean) {
    if (storageConfigured()) await saveChat(settings);
    await sendTelegramMessage(message.chat.id, action === "follow" ? words.usageFollow : words.usageWallet);
    return { handled: true, command: action };
  }
  if (action === "follow") {
    const exists = settings.follows.some(name => name.toLowerCase() === clean.toLowerCase());
    let reply = words.followed(clean);
    if (exists) reply = words.alreadyFollowed(clean);
    else if (settings.follows.length >= MAX_FOLLOWS) reply = words.followLimit;
    else settings.follows.push(clean);
    if (storageConfigured()) await saveChat(settings);
    await sendTelegramMessage(message.chat.id, reply, followingView(settings));
    return { handled: true, command: "follow" };
  }
  const data = await fetchTitanData();
  if (storageConfigured()) await saveChat(settings);
  await sendTelegramMessage(message.chat.id, walletText(data, clean, language), {
    reply_markup: { inline_keyboard: [backRow(language)] },
  });
  return { handled: true, command: "wallet" };
}

function parseCommand(text) {
  const [raw = "", ...rest] = String(text || "").trim().split(/\s+/);
  const command = raw.replace(/^\//, "").split("@")[0].toLowerCase();
  return { command, argument: rest.join(" ").trim() };
}

export async function handleTelegramUpdate(update) {
  if (!(await acceptUpdate(update?.update_id))) return { duplicate: true };
  const callback = update?.callback_query;
  if (callback?.id && callback?.message?.chat?.id && !callback.from?.is_bot) {
    await answerCallbackQuery(callback.id);
    const message = {
      ...callback.message,
      from: callback.from,
      chat: callback.message.chat,
    };
    let settings = await getOrCreateSettings(message);
    const action = String(callback.data || "");
    const [group, value, extra] = action.split(":");
    let view;
    let data = null;
    if (["home", "campaigns", "campaign", "epoch", "health"].includes(group)) {
      data = await fetchTitanData();
    }
    if (group === "home") view = dashboardView(data, settings);
    else if (group === "campaigns") view = campaignListView(data, settings, value);
    else if (group === "campaign") view = campaignDetailView(data, settings, value);
    else if (group === "epoch") view = epochView(data, settings, value);
    else if (group === "following") view = followingView(settings);
    else if (group === "alerts") view = alertSettingsView(settings);
    else if (group === "language" && value) {
      settings.language = normalizeLanguage(value);
      if (storageConfigured()) await saveChat(settings);
      view = languageView(settings);
    } else if (group === "language") view = languageView(settings);
    else if (group === "alert") {
      if (value === "all") settings.alerts = !settings.alerts;
      else if (["campaigns", "epochs", "ranks"].includes(value)) {
        settings.alertTypes[value] = !settings.alertTypes[value];
      }
      if (storageConfigured()) await saveChat(settings);
      view = alertSettingsView(settings);
    } else if (group === "follow" && value === "add") {
      await sendPrompt(message, settings, "follow");
      return { handled: true, callback: action };
    } else if (group === "stats" && value === "add") {
      await sendPrompt(message, settings, "wallet");
      return { handled: true, callback: action };
    } else if (group === "follow" && value === "remove") {
      const index = Number(extra);
      const removed = Number.isInteger(index) ? settings.follows[index] : null;
      if (removed) {
        settings.follows.splice(index, 1);
        delete settings.walletState?.[removed.toLowerCase()];
        if (storageConfigured()) await saveChat(settings);
      }
      view = followingView(settings);
    } else if (group === "health") {
      view = {
        text: statusText(data, settings.language),
        reply_markup: { inline_keyboard: [[
          { text: `↻ ${UI[settings.language].refresh}`, callback_data: "health" },
        ], backRow(settings.language)] },
      };
    } else {
      data = data || await fetchTitanData();
      view = dashboardView(data, settings);
    }
    await editTelegramMessage(message.chat.id, message.message_id, view.text, view);
    return { handled: true, callback: action };
  }

  const message = update?.message;
  if (!message?.chat?.id || !message?.text || message.from?.is_bot) return { ignored: true };
  let settings = await getOrCreateSettings(message);
  if (settings.pendingAction && !String(message.text).trim().startsWith("/")) {
    return handlePendingInput(message, settings);
  }
  const language = settings.language || normalizeLanguage(message.from?.language_code);
  let words = TEXT[language];
  const { command, argument } = parseCommand(message.text);
  const needsData = ["start", "campaigns", "campaign", "epoch", "wallet", "status"].includes(command);
  const data = needsData ? await fetchTitanData() : null;
  let reply = words.help;
  let options = { reply_markup: { inline_keyboard: [backRow(language)] } };

  if (command === "start") {
    if (storageConfigured()) await saveChat(settings);
    const view = dashboardView(data, settings);
    reply = view.text;
    options = view;
  } else if (command === "help" || command === "commands") {
    reply = words.help;
  } else if (command === "campaigns") {
    reply = campaignListText(data, language);
  } else if (command === "campaign") {
    reply = argument ? campaignDetailText(data, argument, language) : words.usageCampaign;
  } else if (command === "epoch") {
    reply = epochText(data, argument.toLowerCase(), language);
  } else if (command === "wallet") {
    const name = argument || settings.follows?.[0] || "";
    reply = name ? walletText(data, name, language) : words.usageWallet;
  } else if (command === "status") {
    reply = statusText(data, language);
  } else if (command === "follow") {
    if (!storageConfigured()) reply = words.storageUnavailable;
    else if (!argument) reply = words.usageFollow;
    else {
      const clean = argument.replace(/^@/, "").trim().slice(0, 80);
      const exists = (settings.follows || []).some(name => name.toLowerCase() === clean.toLowerCase());
      if (exists) reply = words.alreadyFollowed(clean);
      else if ((settings.follows || []).length >= MAX_FOLLOWS) reply = words.followLimit;
      else {
        settings.follows = [...(settings.follows || []), clean];
        await saveChat(settings);
        reply = words.followed(clean);
      }
    }
  } else if (command === "unfollow") {
    if (!storageConfigured()) reply = words.storageUnavailable;
    else if (!argument) reply = words.usageUnfollow;
    else {
      const before = settings.follows || [];
      const after = before.filter(name => name.toLowerCase() !== argument.replace(/^@/, "").toLowerCase());
      if (after.length === before.length) reply = words.notFollowed(argument);
      else {
        settings.follows = after;
        delete settings.walletState?.[argument.toLowerCase()];
        await saveChat(settings);
        reply = words.unfollowed(argument);
      }
    }
  } else if (command === "following") {
    const view = followingView(settings);
    reply = view.text;
    options = view;
  } else if (command === "alerts") {
    if (!storageConfigured()) reply = words.storageUnavailable;
    else if (!["on", "off"].includes(argument.toLowerCase())) reply = words.alertsUsage;
    else {
      settings.alerts = argument.toLowerCase() === "on";
      await saveChat(settings);
      reply = settings.alerts ? words.alertsOn : words.alertsOff;
    }
  } else if (command === "lang") {
    const requested = argument.toLowerCase();
    if (!TEXT[requested]) reply = words.languageUsage;
    else {
      settings.language = requested;
      if (storageConfigured()) await saveChat(settings);
      words = TEXT[requested];
      reply = words.languageSet;
    }
  }

  await sendTelegramMessage(message.chat.id, reply, options);
  return { handled: true, command };
}

const EN_COMMANDS = [
  { command: "campaigns", description: "Active campaigns" },
  { command: "campaign", description: "Campaign details" },
  { command: "epoch", description: "Latest PreStocks epoch" },
  { command: "wallet", description: "Wallet/user volume" },
  { command: "follow", description: "Follow a user" },
  { command: "unfollow", description: "Stop following a user" },
  { command: "following", description: "Followed users" },
  { command: "alerts", description: "Notification settings" },
  { command: "status", description: "Live data health" },
  { command: "lang", description: "English / Türkçe" },
  { command: "help", description: "All commands" },
];

const TR_COMMANDS = [
  { command: "campaigns", description: "Aktif kampanyalar" },
  { command: "campaign", description: "Kampanya detayı" },
  { command: "epoch", description: "Son PreStocks epoch'u" },
  { command: "wallet", description: "Kullanıcı hacmi" },
  { command: "follow", description: "Kullanıcı takip et" },
  { command: "unfollow", description: "Kullanıcı takibini bırak" },
  { command: "following", description: "Takip edilenler" },
  { command: "alerts", description: "Bildirim ayarları" },
  { command: "status", description: "Canlı veri sağlığı" },
  { command: "lang", description: "English / Türkçe" },
  { command: "help", description: "Tüm komutlar" },
];

export async function ensureTelegramWebhook() {
  const target = webhookUrl();
  const info = await telegramCall("getWebhookInfo");
  const allowedUpdates = ["message", "callback_query"];
  const currentAllowed = Array.isArray(info?.allowed_updates) ? info.allowed_updates : [];
  if (
    info?.url !== target ||
    allowedUpdates.some(type => !currentAllowed.includes(type))
  ) {
    await telegramCall("setWebhook", {
      url: target,
      secret_token: webhookSecret(),
      allowed_updates: allowedUpdates,
      drop_pending_updates: false,
      max_connections: 20,
    });
  }
  const currentCommands = await telegramCall("getMyCommands");
  if (JSON.stringify(currentCommands) !== JSON.stringify(EN_COMMANDS)) {
    await telegramCall("setMyCommands", { commands: EN_COMMANDS });
  }
  await telegramCall("setMyCommands", { commands: TR_COMMANDS, language_code: "tr" });
  const bot = await telegramCall("getMe");
  await telegramCall("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "Titan Stats",
      web_app: { url: `${appUrl()}/?telegram=1` },
    },
  });
  await telegramCall("setMyShortDescription", {
    short_description: "Campaigns, epochs, rewards and wallet tracking.",
  });
  await telegramCall("setMyShortDescription", {
    short_description: "Kampanya, epoch, ödül ve kullanıcı takibi.",
    language_code: "tr",
  });
  await telegramCall("setMyDescription", {
    description: "Live Titan campaign dashboard with epoch data, reward tools, wallet tracking and configurable alerts.",
  });
  await telegramCall("setMyDescription", {
    description: "Canlı Titan kampanya paneli; epoch verileri, ödül araçları, kullanıcı takibi ve ayarlanabilir bildirimler.",
    language_code: "tr",
  });
  return { username: bot.username, webhook: target };
}

function buildCampaignState(data) {
  const campaigns = {};
  for (const [slug, value] of campaignEntries(data)) {
    campaigns[slug] = {
      label: campaignLabel(slug, value.meta),
      status: campaignStatus(value.meta),
      epoch: activeCampaignEpoch(value.meta),
      endTime: timestampMs(value.meta?.endTime),
    };
  }
  const epochs = numericEpochs(data);
  return {
    prestockEpoch: epochs.length ? epochs.at(-1) : null,
    campaigns,
    generatedAt: Number(data?.all?.generatedAt) || Date.now(),
  };
}

function globalEvents(previous, current, language) {
  if (!previous) return [];
  const words = TEXT[language];
  const events = [];
  if (current.prestockEpoch && previous.prestockEpoch && current.prestockEpoch > previous.prestockEpoch) {
    events.push({ type: "epochs", text: words.prestockEpoch(current.prestockEpoch) });
  }
  for (const [slug, campaign] of Object.entries(current.campaigns)) {
    const before = previous.campaigns?.[slug];
    if (!before) {
      if (campaign.status !== "ended") {
        events.push({ type: "campaigns", text: words.campaignDiscovered(campaign.label) });
      }
      continue;
    }
    if (before.status !== campaign.status) {
      if (campaign.status === "live") {
        events.push({ type: "campaigns", text: words.campaignStarted(campaign.label) });
      }
      if (campaign.status === "ended") {
        events.push({ type: "campaigns", text: words.campaignEnded(campaign.label) });
      }
    }
    if (before.epoch && campaign.epoch && before.epoch !== campaign.epoch && campaign.status === "live") {
      events.push({ type: "epochs", text: words.epochChanged(campaign.label, before.epoch, campaign.epoch) });
    }
  }
  return events;
}

function followedUserEvents(chat, data) {
  const language = chat.language || "en";
  const words = TEXT[language];
  const epoch = latestEpochKey(data);
  const nextState = {};
  const events = [];
  for (const name of chat.follows || []) {
    const metrics = walletMetrics(data, epoch, name);
    const currentRank = metrics.bestRank;
    nextState[name.toLowerCase()] = { rank: currentRank, epoch };
    const before = chat.walletState?.[name.toLowerCase()];
    if (!before?.rank || !currentRank || before.epoch !== epoch || before.rank === currentRank) continue;
    const meaningful = currentRank <= 10 || Math.abs(before.rank - currentRank) >= 5;
    if (!meaningful) continue;
    events.push({
      type: "ranks",
      text: currentRank < before.rank
        ? words.rankImproved(name, before.rank, currentRank)
        : words.rankDropped(name, before.rank, currentRank),
    });
  }
  return { events, nextState };
}

export async function runTelegramNotifications() {
  const data = await fetchTitanData();
  if (!storageConfigured()) return { storage: false, subscribers: 0, sent: 0 };
  const current = buildCampaignState(data);
  const previous = parseJson(await redisCommand("GET", stateKey), null);
  const chats = await allChats();
  let sent = 0;
  for (const rawChat of chats) {
    const chat = normalizeSettings(rawChat);
    const language = chat.language === "tr" ? "tr" : "en";
    const global = globalEvents(previous, current, language);
    const followed = followedUserEvents(chat, data);
    chat.walletState = followed.nextState;
    await saveChat(chat);
    const events = chat.alerts === false
      ? []
      : [...global, ...followed.events].filter(event => chat.alertTypes[event.type] !== false);
    if (!events.length) continue;
    try {
      await sendTelegramMessage(
        chat.chatId,
        `🔔 ${TEXT[language].notificationTitle}\n\n${events.map(event => event.text).join("\n\n")}`,
        {
          reply_markup: {
            inline_keyboard: [[
              miniAppButton(`↗️ ${UI[language].openDashboard}`, "overview", chat.chatType),
              { text: `⚙️ ${UI[language].alertSettings}`, callback_data: "alerts" },
            ]],
          },
        }
      );
      sent++;
    } catch (error) {
      if (error.code === 403) await deleteChat(chat.chatId);
    }
  }
  await redisCommand("SET", stateKey, JSON.stringify(current));
  return { storage: true, subscribers: chats.length, sent, seeded: !previous };
}

function verifyTelegramMiniAppData(initData) {
  const token = telegramToken();
  if (!token || !initData) return null;
  const params = new URLSearchParams(String(initData));
  const hash = params.get("hash") || "";
  const authDate = Number(params.get("auth_date")) || 0;
  const now = Math.floor(Date.now() / 1000);
  if (!hash || !authDate || authDate > now + 60 || now - authDate > 86400) return null;
  const checkString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const expected = createHmac("sha256", secret).update(checkString).digest("hex");
  if (!safeEqual(expected, hash)) return null;
  const user = parseJson(params.get("user"), null);
  if (!user?.id) return null;
  return user;
}

function publicTelegramSettings(settings) {
  const normalized = normalizeSettings(settings);
  return {
    language: normalized.language,
    alerts: normalized.alerts,
    alertTypes: normalized.alertTypes,
    follows: normalized.follows,
  };
}

export async function readTelegramMiniAppSettings(initData) {
  if (!storageConfigured()) throw new Error("Storage is not configured");
  const user = verifyTelegramMiniAppData(initData);
  if (!user) {
    const error = new Error("Invalid Telegram Mini App authorization");
    error.status = 401;
    throw error;
  }
  let settings = normalizeSettings(await getChat(user.id));
  if (!settings) {
    settings = initialSettings({
      chat: { id: user.id, type: "private" },
      from: user,
    });
    await saveChat(settings);
  }
  return publicTelegramSettings(settings);
}

export async function updateTelegramMiniAppSettings(initData, patch = {}) {
  if (!storageConfigured()) throw new Error("Storage is not configured");
  const user = verifyTelegramMiniAppData(initData);
  if (!user) {
    const error = new Error("Invalid Telegram Mini App authorization");
    error.status = 401;
    throw error;
  }
  let settings = normalizeSettings(await getChat(user.id)) || initialSettings({
    chat: { id: user.id, type: "private" },
    from: user,
  });
  if (typeof patch.language === "string") settings.language = normalizeLanguage(patch.language);
  if (typeof patch.alerts === "boolean") settings.alerts = patch.alerts;
  if (patch.alertTypes && typeof patch.alertTypes === "object") {
    for (const key of ["campaigns", "epochs", "ranks"]) {
      if (typeof patch.alertTypes[key] === "boolean") settings.alertTypes[key] = patch.alertTypes[key];
    }
  }
  if (Array.isArray(patch.follows)) {
    const unique = [];
    for (const value of patch.follows) {
      const clean = String(value || "").replace(/^@/, "").trim().slice(0, 80);
      if (clean && !unique.some(name => name.toLowerCase() === clean.toLowerCase())) unique.push(clean);
      if (unique.length >= MAX_FOLLOWS) break;
    }
    settings.follows = unique;
  }
  await saveChat(settings);
  return publicTelegramSettings(settings);
}

function decodeBase64Url(value) {
  return Buffer.from(String(value || ""), "base64url");
}

let githubJwks = null;
let githubJwksAt = 0;

async function getGithubJwks() {
  if (githubJwks && Date.now() - githubJwksAt < 3600000) return githubJwks;
  const response = await fetch(`${GITHUB_OIDC_ISSUER}/.well-known/jwks`);
  if (!response.ok) throw new Error("GitHub JWKS unavailable");
  githubJwks = await response.json();
  githubJwksAt = Date.now();
  return githubJwks;
}

export async function verifySchedulerAuthorization(authorization) {
  const bearer = String(authorization || "").replace(/^Bearer\s+/i, "");
  if (!bearer) return false;
  if (process.env.CRON_SECRET && safeEqual(bearer, process.env.CRON_SECRET)) return true;
  const parts = bearer.split(".");
  if (parts.length !== 3) return false;
  try {
    const header = JSON.parse(decodeBase64Url(parts[0]).toString("utf8"));
    const claims = JSON.parse(decodeBase64Url(parts[1]).toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (claims.iss !== GITHUB_OIDC_ISSUER || !audience.includes(GITHUB_OIDC_AUDIENCE)) return false;
    if (claims.repository !== GITHUB_REPOSITORY || claims.ref !== "refs/heads/main") return false;
    if (!String(claims.workflow_ref || "").includes(`${GITHUB_WORKFLOW}@refs/heads/main`)) return false;
    if (Number(claims.exp) <= now || Number(claims.nbf || 0) > now + 30) return false;
    const jwks = await getGithubJwks();
    const jwk = jwks.keys?.find(key => key.kid === header.kid && key.kty === "RSA");
    if (!jwk || header.alg !== "RS256") return false;
    const key = await webcrypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    return webcrypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      decodeBase64Url(parts[2]),
      Buffer.from(`${parts[0]}.${parts[1]}`)
    );
  } catch {
    return false;
  }
}
