#!/usr/bin/env bun
/**
 * Browser regression for the spacing rhythm.
 *
 * Two values own the layout: 12px between a section label and its first row,
 * and 16px between modules. Both are tokens (`--spacing-head`, `--spacing-band`);
 * this walks the real app and fails when either drifts, including when a card
 * ends up touching the one beside it.
 *
 * Runs in Chromium because these are computed gaps, not class names a unit test
 * could read.
 *
 * Usage: bun run test:spacing
 */
import { spawn } from "bun";
import { chromium } from "playwright";

const HEAD = 12;
const BAND = 16;
const TOLERANCE = 0.5;
const PORT = 5199;
const BASE = `http://localhost:${PORT}`;
const ROUTES = [
  ["overview", "/?mock=1#/"],
  ["detail", "/?mock=1#/repo/sthbryan%2Fasterism"],
  ["pulls", "/?mock=1#/pull/sthbryan%2Fasterism/42"],
  ["picker", "/?mock=1#/repos"],
  ["create", "/?mock=1#/create"],
  ["settings", "/?mock=1#/settings"],
];

/** Gap from each section head's bottom edge to the row that follows it. */
function measureHeads() {
  const rows = [];
  for (const section of document.querySelectorAll(".app-section")) {
    const head = section.firstElementChild;
    if (!head?.classList.contains("app-section-head")) continue;
    const next = head.nextElementSibling;
    if (!next) continue;
    rows.push({
      from: head.textContent.trim().replace(/\s+/g, " ").slice(0, 26),
      to: "",
      gap:
        next.getBoundingClientRect().top - head.getBoundingClientRect().bottom,
    });
  }
  return rows;
}

/**
 * Every module gap on the page: the declared rhythms (stacks, grid gaps, card
 * margins) plus the nearest card above or beside each card, so a module that
 * nobody put in a stack still reports its real distance.
 */
function measureBands() {
  const short = (el) => {
    const head = el.querySelector?.(".app-section-head");
    const text = (head ?? el).textContent ?? "";
    return (
      text.trim().replace(/\s+/g, " ").slice(0, 26) ||
      String(el.className).split(" ")[0] ||
      el.tagName
    );
  };
  const rows = [];

  for (const el of document.querySelectorAll(".space-y-band")) {
    const kids = [...el.children];
    for (let i = 1; i < kids.length; i++) {
      rows.push({
        from: short(kids[i - 1]),
        to: short(kids[i]),
        gap:
          kids[i].getBoundingClientRect().top -
          kids[i - 1].getBoundingClientRect().bottom,
      });
    }
  }

  for (const el of document.querySelectorAll(".gap-band, .app-kpis")) {
    const style = getComputedStyle(el);
    for (const [axis, value] of [
      ["column", style.columnGap],
      ["row", style.rowGap],
    ]) {
      if (!value || value === "normal") continue;
      rows.push({ from: short(el), to: `${axis} gap`, gap: parseFloat(value) });
    }
  }

  for (const el of document.querySelectorAll(".mt-band")) {
    rows.push({
      from: "above",
      to: short(el),
      gap: parseFloat(getComputedStyle(el).marginTop),
    });
  }

  const overlap = (aStart, aEnd, bStart, bEnd) =>
    Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
  // Skeleton cards stay mounted under the real content while they crossfade
  // out; they are painted at zero opacity and would report phantom gaps.
  const cards = [
    ...document.querySelectorAll(".app-section, .app-kpis, .app-card"),
  ]
    .filter(
      (el) =>
        el.getBoundingClientRect().height > 0 &&
        el.checkVisibility({ visibilityProperty: true, opacityProperty: true }),
    )
    .map((el) => ({ el, r: el.getBoundingClientRect() }));

  for (const a of cards) {
    let above = null;
    let beside = null;
    for (const b of cards) {
      if (b === a) continue;
      const sharesColumn =
        overlap(a.r.left, a.r.right, b.r.left, b.r.right) > 1;
      const sharesRow = overlap(a.r.top, a.r.bottom, b.r.top, b.r.bottom) > 1;
      if (
        sharesColumn &&
        b.r.bottom <= a.r.top + 0.5 &&
        (!above || b.r.bottom > above.r.bottom)
      ) {
        above = b;
      }
      if (
        sharesRow &&
        b.r.right <= a.r.left + 0.5 &&
        (!beside || b.r.right > beside.r.right)
      ) {
        beside = b;
      }
    }
    if (above) {
      rows.push({
        from: short(above.el),
        to: short(a.el),
        gap: a.r.top - above.r.bottom,
      });
    }
    if (beside) {
      rows.push({
        from: short(beside.el),
        to: short(a.el),
        gap: a.r.left - beside.r.right,
      });
    }
  }

  // The declared passes and the geometric pass can land on the same pair.
  const seen = new Map();
  for (const row of rows) {
    seen.set(`${row.from}|${row.to}|${row.gap.toFixed(1)}`, row);
  }
  return [...seen.values()];
}

let failed = 0;
let measured = 0;
const server = spawn(
  ["./node_modules/.bin/vite", "--port", String(PORT), "--strictPort"],
  // Piped, not inherited: a child that outlives the kill would otherwise keep
  // the caller's stdio open and hang the shell.
  { stdout: "pipe", stderr: "pipe" },
);
let browser;

function bail(message) {
  console.error(`✗ ${message}`);
  failed += 1;
}

function report(route, rows, expected) {
  for (const row of rows) {
    measured += 1;
    if (Math.abs(row.gap - expected) <= TOLERANCE) continue;
    failed += 1;
    console.log(
      `✗ ${route.padEnd(8)} ${row.gap.toFixed(1).padStart(5)}px  ${row.from} → ${
        row.to || "(first row)"
      }`,
    );
  }
}

try {
  const deadline = Date.now() + 30_000;
  for (;;) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) {
      throw new Error(
        `vite did not answer on ${BASE}: ${await new Response(server.stderr).text()}`,
      );
    }
    await Bun.sleep(200);
  }

  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  for (const [name, route] of ROUTES) {
    await page.goto(`${BASE}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    await page.waitForSelector(".app-section, .app-card, .app-kpis", {
      timeout: 20_000,
    });
    // Skeleton hosts stay mounted while they fade out; measuring then reads
    // phantom cards. Wait for the reveal, then let fonts and the crossfade land.
    await page.waitForFunction(
      () => {
        const host = document.querySelector(".t-skel");
        return !host || host.classList.contains("is-revealed");
      },
      null,
      { timeout: 20_000 },
    );
    await page.evaluate(() =>
      document.fonts.ready.then(
        () => new Promise((done) => setTimeout(done, 400)),
      ),
    );
    const heads = await page.evaluate(measureHeads);
    const bands = await page.evaluate(measureBands);
    if (heads.length + bands.length === 0) {
      bail(`${name}: nothing to measure, the check cannot run`);
      continue;
    }
    report(name, heads, HEAD);
    report(name, bands, BAND);
    console.log(
      `· ${name.padEnd(8)} ${String(heads.length).padStart(2)} heads, ${String(bands.length).padStart(2)} gaps`,
    );
  }
} catch (error) {
  bail(error instanceof Error ? error.message : String(error));
} finally {
  await browser?.close();
  server.kill("SIGKILL");
}

if (failed > 0) {
  console.error(
    `\n${failed} of ${measured} gaps drifted from ${HEAD}px (heads) / ${BAND}px (bands).`,
  );
} else {
  console.log(`\n${measured} gaps: heads ${HEAD}px, bands ${BAND}px.`);
}
process.exit(failed > 0 ? 1 : 0);
