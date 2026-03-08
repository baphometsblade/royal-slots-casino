const fs = require("fs");
const fsp = fs.promises;
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "output", "web-game", "regression");
const HOST = "127.0.0.1";
const PORT = Number(process.env.CASINO_QA_PORT || 4175);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function contentTypeFor(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function resolveRequestPath(urlPath) {
  const cleanPath = decodeURIComponent((urlPath || "/").split("?")[0]);
  const requested = cleanPath === "/" ? "/index.html" : cleanPath;
  const absolute = path.resolve(ROOT_DIR, `.${requested}`);
  if (!absolute.startsWith(ROOT_DIR)) {
    return null;
  }
  return absolute;
}

async function startStaticServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const filePath = resolveRequestPath(req.url);
      if (!filePath) {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
      }

      let stat;
      try {
        stat = await fsp.stat(filePath);
      } catch {
        res.statusCode = 404;
        res.end("Not Found");
        return;
      }

      if (!stat.isFile()) {
        res.statusCode = 404;
        res.end("Not Found");
        return;
      }

      const data = await fsp.readFile(filePath);
      res.statusCode = 200;
      res.setHeader("Content-Type", contentTypeFor(filePath));
      res.end(data);
    } catch (error) {
      res.statusCode = 500;
      res.end(`Internal Server Error: ${error.message}`);
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, HOST, () => {
      server.removeListener("error", reject);
      resolve();
    });
  });

  return server;
}

async function closeServer(server) {
  if (!server) return;
  await new Promise((resolve) => server.close(() => resolve()));
}

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

async function readState(page) {
  return page.evaluate(() => {
    if (typeof window.render_game_to_text !== "function") {
      throw new Error("render_game_to_text is not available");
    }
    return JSON.parse(window.render_game_to_text());
  });
}

async function waitForState(page, predicate, timeoutMs) {
  await page.waitForFunction(
    (fnSource) => {
      if (typeof window.render_game_to_text !== "function") return false;
      const state = JSON.parse(window.render_game_to_text());
      // eslint-disable-next-line no-new-func
      const fn = new Function("state", `return (${fnSource})(state);`);
      return Boolean(fn(state));
    },
    predicate.toString(),
    { timeout: timeoutMs }
  );
}

async function ensureQaPanelOpen(page) {
  const panelOpen = await page.$eval("#qaToolsBody", (el) => el.classList.contains("active"));
  if (!panelOpen) {
    await page.click("#qaToggleBtn");
    await page.waitForFunction(
      () => document.getElementById("qaToolsBody")?.classList.contains("active") === true,
      { timeout: 5000 }
    );
  }
}

async function waitForPageTransitionIdle(page, timeout = 10000) {
  await page.waitForFunction(
    () => {
      const transition = document.getElementById("pageTransition");
      return !transition || !transition.classList.contains("active");
    },
    { timeout }
  );
}

async function dismissFeaturePopupIfVisible(page) {
  // Always force-dismiss via JS — safe even if the popup isn't visible.
  // Avoids waitForFunction timeouts caused by CSS transitions or re-opens.
  // Also clears Sprint 27-33 promotional overlays that may appear during QA.
  await page.evaluate(() => {
    if (typeof dismissFeaturePopup === "function") dismissFeaturePopup();
    const overlayIds = [
      "slotFeaturePopup",
      "welcomeOfferOverlay",
      "exitIntentOverlay",
      "flashSaleOverlay",
      "lossRecoveryOverlay",
      "happyHourBanner",
      "referralPanel",
      "loyaltyShopModal",
      "firstDepositOverlay",
      "piggyBankWidget",
      "piggyBankModal",
      "spinStreakBar",
      "sessionTimeBar",
      "winMultiplierBanner",
      "dailyChallengePanel",
      "dcFab",
      "depositMatchOverlay",
      "luckyWheelOverlay",
      "weekendTournamentBar",
      "lossComfortOverlay",
      "achievementContainer",
      "flashDealBanner",
      "vipProgressMeter",
      "socialProofContainer",
      "comebackOverlay",
      "dailyLoginCalendar",
      "reloadBonusBar",
      "jackpotTicker",
      "referralLeaderboard",
      "spinInsuranceBar",
      "happyHourBar",
      "lossRecovery2Overlay",
      "sessionMilestoneBar",
      "betSuggestChip",
      "loyaltyShop2Modal",
      "loyaltyShop2Fab",
      "winWheelOverlay",
      "autoCashoutPanel",
      "autoCashoutCelebration",
      "mysteryBoxOverlay",
      "tournamentBar",
      "bonusMeterBar",
      "dailyCashbackPanel",
      "slotRaceBar",
      "depositStreakPanel",
      "vipWheelOverlay",
      "lossLimitBar",
      "quickBetStrip",
      "spinMultiplierBanner",
      "referralTrackerPanel",
      "sessionRewardPopup",
      "luckyNumberOverlay",
      "achievementBadgePanel",
      "betInsuranceBar",
      "loyaltyPointsShop",
      "winCelebrationOverlay",
      "autoCollectBar",
      "favQuickPlayBar",
      "wagerProgressPanel",
      "freeSpinMeterBar",
      "dailyDepositGoal",
      "cashbackStreakBar",
      "mysteryGiftOverlay",
      "betLadderPanel",
      "tournamentLeaderboard",
      "lossStreakComfort",
    ];
    overlayIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = "none";
        el.style.visibility = "hidden";
        el.style.pointerEvents = "none";
        el.classList.remove("active");
      }
    });
  });
  // Brief pause to let any CSS transitions settle
  await page.waitForTimeout(300);
}

async function clickSpinButton(page) {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await waitForPageTransitionIdle(page, 10000);
    await dismissFeaturePopupIfVisible(page);
    await waitForPageTransitionIdle(page, 5000);
    try {
      // Ensure spinBtn is actually visible and clickable
      await page.waitForSelector("#spinBtn", { state: "visible", timeout: 5000 });
      await page.click("#spinBtn", { timeout: 6000, force: true });
      return;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await page.waitForTimeout(500);
    }
  }
}

async function run() {
  await ensureDir(OUTPUT_DIR);

  const server = await startStaticServer();
  const baseUrl = `http://${HOST}:${PORT}/index.html`;
  const errorsPath = path.join(OUTPUT_DIR, "errors.json");
  const runtimeErrors = [];
  const runtimeErrorSet = new Set();
  const summary = {
    baseUrl,
    checks: [],
    passed: false,
    timestamp: new Date().toISOString(),
  };

  let browser;
  let page;

  const resetArtifact = async (fileName) => {
    try {
      await fsp.unlink(path.join(OUTPUT_DIR, fileName));
    } catch {
      // no-op
    }
  };

  const trackRuntimeError = (type, text) => {
    const cleanText = String(text || "").trim();
    if (!cleanText) return;
    // Ignore 404 "Failed to load resource" errors — these come from animated WebP
    // assets that don't exist yet (ui-slot.js loads .webp with .png onerror fallback).
    // Browser console.error text doesn't include the URL, so we can't filter by path.
    // Script/CSS 404s would cause other visible test failures, so this is safe.
    if (cleanText.includes("404") && cleanText.includes("Failed to load resource")) return;
    const key = `${type}:${cleanText}`;
    if (runtimeErrorSet.has(key)) return;
    runtimeErrorSet.add(key);
    runtimeErrors.push({ type, text: cleanText });
  };

  try {
    await resetArtifact("summary.json");
    await resetArtifact("state-0.json");
    await resetArtifact("shot-0.png");
    await resetArtifact("failure-shot.png");
    await resetArtifact("errors.json");

    browser = await chromium.launch({
      headless: true,
      args: ["--use-gl=angle", "--use-angle=swiftshader"],
    });

    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    page = await context.newPage();

    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      trackRuntimeError("console.error", msg.text());
    });
    page.on("pageerror", (err) => {
      trackRuntimeError("pageerror", String(err));
    });

    await page.goto(baseUrl + "?noBonus=1", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.removeItem("casinoBalance");
      localStorage.removeItem("casinoStats");
      localStorage.removeItem("soundEnabled");
      localStorage.removeItem("casinoXP");
      localStorage.removeItem("casinoDailyBonus");
      localStorage.removeItem("casinoBonusWheel");
      // Inject a QA test user so the auth gate is bypassed
      localStorage.setItem("casinoUser", JSON.stringify({ id: 0, username: "QA_Test", is_admin: false }));
      localStorage.setItem("casinoToken", "local-qa-regression-token");
    });
    await page.goto(baseUrl + "?noBonus=1", { waitUntil: "domcontentloaded" });

    const lobbyState = await readState(page);
    assert(lobbyState.mode === "lobby", "Expected lobby mode after initial load");
    summary.checks.push({
      name: "lobby-mode",
      mode: lobbyState.mode,
      balance: lobbyState.balance,
      ok: true,
    });

    await page.evaluate(() => openStatsModal());
    await page.waitForSelector("#statsModal.active", { timeout: 10000 });
    await ensureQaPanelOpen(page);

    const statsState = await readState(page);
    assert(statsState.mode === "stats", "Expected stats mode when stats modal is open");
    summary.checks.push({
      name: "stats-modal-open",
      mode: statsState.mode,
      ok: true,
    });

    await page.fill("#qaSeedInput", "regression-seed-1");
    await page.click("button:has-text('Apply Seed')");
    // Queue a triple win outcome via JS API — use fire_joker (classic 3×3 grid)
    const firstSymbol = await page.evaluate(() => {
      const game = games.find(g => g.id === 'fire_joker');
      const sym = (game && game.symbols) ? game.symbols[0] : 'seven';
      // Temporarily set currentGame so queueForcedSpin resolves correctly
      const prevGame = currentGame;
      currentGame = game;
      const result = queueForcedSpin([sym, sym, sym]);
      currentGame = prevGame;
      refreshQaStateDisplay();
      return sym;
    });

    const qaStateLine = (await page.textContent("#qaStateLine")) || "";
    assert(qaStateLine.includes("seed=regression-seed-1"), "Seed was not applied in QA state line");
    assert(qaStateLine.includes("queued=1"), "Queued count was not updated in QA state line");
    summary.checks.push({
      name: "qa-seed-and-queue",
      stateLine: qaStateLine,
      ok: true,
    });

    await page.click("#statsModal .back-btn");
    await page.waitForSelector("#statsModal.active", { state: "hidden", timeout: 10000 });

    await page.evaluate(() => {
      openSlot("fire_joker");
    });
    await page.waitForSelector("#slotModal.active", { timeout: 10000 });
    // Generous pause — many Sprint 31-34 features schedule init timers (600-1400ms)
    await page.waitForTimeout(2000);
    await dismissFeaturePopupIfVisible(page);
    await page.waitForTimeout(500);
    await dismissFeaturePopupIfVisible(page);
    await clickSpinButton(page);
    await waitForState(page, (state) => !state.spinning && state.stats.totalSpins >= 1, 60000);

    const afterSpin = await readState(page);
    assert(afterSpin.mode === "slot", "Expected slot mode after spin");
    assert(afterSpin.message.type === "win", "Expected win message for forced triple outcome");
    const expectedReels = `${firstSymbol},${firstSymbol},${firstSymbol}`;
    assert(afterSpin.reels.join(",") === expectedReels, `Forced triple outcome did not resolve to ${expectedReels}, got ${afterSpin.reels.join(",")}`);
    assert(afterSpin.reels[0] === afterSpin.reels[1] && afterSpin.reels[1] === afterSpin.reels[2], "Triple outcome reels are not all equal");
    summary.checks.push({
      name: "forced-triple-spin",
      reels: afterSpin.reels,
      message: afterSpin.message,
      ok: true,
    });

    await page.keyboard.press("Escape");
    await page.waitForSelector("#slotModal.active", { state: "hidden", timeout: 10000 });
    await page.evaluate(() => openStatsModal());
    await page.waitForSelector("#statsModal.active", { timeout: 10000 });
    await ensureQaPanelOpen(page);

    await page.check("#qaResetClearSeed");
    await page.click("button:has-text('Reset Balance + Stats')");

    const afterReset = await readState(page);
    const resetStatus = (await page.textContent("#qaStatusLine")) || "";
    const resetLine = (await page.textContent("#qaStateLine")) || "";
    assert(afterReset.balance === 5000, "Reset did not restore default balance");
    assert(afterReset.stats.totalSpins === 0, "Reset did not clear spins");
    assert(afterReset.stats.totalWagered === 0, "Reset did not clear total wagered");
    assert(afterReset.stats.totalWon === 0, "Reset did not clear total won");
    assert(afterReset.debug.deterministicMode === false, "Reset with clear-seed did not disable deterministic mode");
    assert(afterReset.debug.deterministicSeed === null, "Reset with clear-seed did not clear deterministic seed");
    assert(resetLine.includes("seed=off"), "QA state line did not report seed=off after reset");
    assert(resetStatus.toLowerCase().includes("seed cleared"), "Reset status did not mention seed clearing");
    summary.checks.push({
      name: "reset-clear-seed",
      status: resetStatus,
      stateLine: resetLine,
      mode: afterReset.mode,
      ok: true,
    });

    await page.screenshot({ path: path.join(OUTPUT_DIR, "shot-0.png"), fullPage: true });
    await fsp.writeFile(path.join(OUTPUT_DIR, "state-0.json"), JSON.stringify(afterReset, null, 2));

    summary.runtimeErrorCount = runtimeErrors.length;
    if (runtimeErrors.length > 0) {
      await fsp.writeFile(errorsPath, JSON.stringify(runtimeErrors, null, 2));
      throw new Error(`Detected ${runtimeErrors.length} browser runtime errors. See output/web-game/regression/errors.json`);
    }

    summary.passed = true;
    await fsp.writeFile(path.join(OUTPUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));
    console.log("Casino QA regression passed.");
  } catch (error) {
    summary.passed = false;
    summary.error = error.message;
    summary.runtimeErrorCount = runtimeErrors.length;
    if (runtimeErrors.length > 0) {
      summary.runtimeErrors = runtimeErrors;
      await fsp.writeFile(errorsPath, JSON.stringify(runtimeErrors, null, 2));
    }
    if (page) {
      try {
        await page.screenshot({ path: path.join(OUTPUT_DIR, "failure-shot.png"), fullPage: true });
      } catch {
        // no-op
      }
    }
    await fsp.writeFile(path.join(OUTPUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
    await closeServer(server);
  }
}

run().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
