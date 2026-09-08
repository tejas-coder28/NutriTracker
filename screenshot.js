/**
 * NutriTracker AI — Puppeteer Screenshot Automation
 * ====================================================
 * Captures real screenshots of every key screen and saves them to
 * mobile/assets/screenshots/ for use in the README.
 *
 * Usage:
 *   1. Start the Expo web server first (in a separate terminal):
 *        cd mobile && npx expo start --web
 *   2. Wait until you see "Web is waiting on http://localhost:8081"
 *   3. Then in another terminal (from the repo root):
 *        node screenshot.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:8081';
const SCREENSHOTS_DIR = path.join(__dirname, 'mobile', 'assets', 'screenshots');

// Unique test credentials each run
const TEST_EMAIL    = `nutritest_${Date.now()}@example.com`;
const TEST_PASSWORD = 'Test1234!';
const TEST_NAME     = 'Tejas Test';

// Mobile viewport
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2 };

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function shot(page, filename) {
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  ✅  Saved: ${filename}`);
}

async function waitForText(page, text, timeout = 25000) {
  await page.waitForFunction(
    (t) => document.body.innerText.includes(t),
    { timeout },
    text
  );
}

/**
 * Fill a React Native Web TextInput by placeholder text.
 * Uses native value setter to trigger React's synthetic onChange.
 */
async function fillByPlaceholder(page, placeholder, value) {
  const filled = await page.evaluate((ph, val) => {
    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    const input = inputs.find(el => el.placeholder === ph || el.placeholder.includes(ph));
    if (!input) return false;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, placeholder, value);
  if (!filled) console.warn(`  ⚠️  Could not fill input with placeholder: "${placeholder}"`);
  return filled;
}

/**
 * Fill nth input on the page (0-indexed).
 */
async function fillNthInput(page, index, value) {
  await page.evaluate((idx, val) => {
    const inputs = Array.from(document.querySelectorAll('input:not([readonly]):not([disabled])'));
    const input = inputs[idx];
    if (!input) return false;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, index, value);
}

/**
 * Click an element by its visible text content.
 */
async function clickText(page, text, timeout = 5000) {
  // Try locator first
  try {
    await page.locator(`::-p-text(${text})`).click({ timeout });
    return true;
  } catch {}
  // Fallback: DOM walk
  const clicked = await page.evaluate((searchText) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const candidates = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent.trim() === searchText || node.textContent.trim().includes(searchText)) {
        const el = node.parentElement;
        if (el && el.offsetParent !== null) candidates.push(el);
      }
    }
    if (candidates.length > 0) { candidates[0].click(); return true; }
    return false;
  }, text);
  return clicked;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

(async () => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  console.log('\n🚀  Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 40,
    defaultViewport: VIEWPORT,
    executablePath: 'C:\\Users\\Tejas\\.cache\\puppeteer\\chrome\\win64-148.0.7778.97\\chrome-win64\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // ── 1. Open app ───────────────────────────────────────────────────────────
  console.log(`\n📡  Opening ${BASE_URL} ...`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

  console.log('⏳  Waiting for Auth screen...');
  await waitForText(page, 'Log In', 35000);
  await sleep(2000);

  // ── 2. Login screenshot ───────────────────────────────────────────────────
  console.log('\n📸  Step 1 — Login screen');
  await shot(page, 'login.png');

  // ── 3. Register tab ───────────────────────────────────────────────────────
  console.log('\n🔄  Switching to Register tab...');
  await clickText(page, 'Register');
  await sleep(1000);

  console.log('📸  Step 2 — Register screen');
  await shot(page, 'register.png');

  // ── 4. Fill registration form ─────────────────────────────────────────────
  console.log('\n✏️   Filling registration form...');

  // Full Name input (placeholder: "Tejas Muralidhar")
  await fillByPlaceholder(page, 'Tejas Muralidhar', TEST_NAME);
  await sleep(200);

  // Email (placeholder: "tejas@example.com")
  await fillByPlaceholder(page, 'tejas@example.com', TEST_EMAIL);
  await sleep(200);

  // Password (type="password")
  const pwFilled = await page.evaluate((val) => {
    const inputs = Array.from(document.querySelectorAll('input[type="password"]'));
    if (!inputs[0]) return false;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(inputs[0], val);
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, TEST_PASSWORD);
  console.log(`  Password field: ${pwFilled ? 'filled' : 'not found'}`);
  await sleep(300);

  // Submit
  console.log('📤  Submitting registration...');
  await clickText(page, 'Create Account');

  // ── 5. Onboarding ─────────────────────────────────────────────────────────
  console.log('⏳  Waiting for Onboarding screen...');
  await waitForText(page, 'NutriTrack AI', 30000);
  await sleep(2500);

  console.log('📸  Step 3 — Onboarding screen');
  await shot(page, 'onboarding.png');

  // ── 6. Fill onboarding form ───────────────────────────────────────────────
  console.log('\n✏️   Filling onboarding form...');

  // The onboarding form has these editable inputs (in order, read-only email excluded):
  // 0: Full Name  (placeholder: "Enter your name")
  // 1: Age        (placeholder: "25")
  // 2: Height     (placeholder: "175")
  // 3: Weight     (placeholder: "75")
  // 4: Target Weight (placeholder: "70")
  // 5: Water Goal (placeholder: "8")

  // Fill by placeholder (most reliable)
  await fillByPlaceholder(page, 'Enter your name', TEST_NAME);
  await sleep(150);
  await fillByPlaceholder(page, '25', '24');
  await sleep(150);
  await fillByPlaceholder(page, '175', '178');
  await sleep(150);
  await fillByPlaceholder(page, '75', '75');
  await sleep(150);
  await fillByPlaceholder(page, '70', '70');
  await sleep(150);
  await fillByPlaceholder(page, '8', '8');
  await sleep(300);

  // Select gender: Male
  await clickText(page, 'Male');
  await sleep(200);

  // Select Activity Level: Moderate
  await clickText(page, 'Moderate (1.55)');
  await sleep(500); // let rate previews recalculate

  // Select fat loss rate — click the first rate option card (0.25 kg/week)
  const rateClicked = await page.evaluate(() => {
    // Rate option cards contain "kg/week" text
    const allEls = Array.from(document.querySelectorAll('*'));
    const rateEl = allEls.find(el =>
      el.children.length === 0 &&
      el.textContent.includes('kg/week') &&
      el.offsetParent !== null
    );
    if (rateEl) { rateEl.closest('[role]')?.click() || rateEl.parentElement?.click(); return true; }
    return false;
  });
  console.log(`  Rate option clicked: ${rateClicked}`);
  await sleep(400);

  // Scroll to bottom to see the save button
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(600);

  // Click Save button
  console.log('💾  Clicking Save & Recalculate Targets...');
  const saved = await clickText(page, 'Save & Recalculate Targets');
  if (!saved) {
    // Try a broader match
    await clickText(page, 'Save');
  }

  // ── 7. Dashboard ─────────────────────────────────────────────────────────
  console.log('⏳  Waiting for Home Dashboard...');
  try {
    await waitForText(page, 'Welcome back', 30000);
  } catch {
    await waitForText(page, 'Net Cals', 20000);
  }
  await sleep(3000);

  // Scroll to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);

  console.log('📸  Step 4 — Dashboard');
  await shot(page, 'dashboard.png');

  // ── 8. Add Food modal ─────────────────────────────────────────────────────
  console.log('\n🍔  Opening Add Food modal...');
  try {
    await clickText(page, '+ Add Food');
    await sleep(3000);
    console.log('📸  Step 5 — Add Food modal');
    await shot(page, 'addfood.png');
    await page.keyboard.press('Escape');
    await sleep(800);
  } catch (e) { console.warn('  ⚠️  Add Food modal:', e.message); }

  // ── 9. Log Workout modal ──────────────────────────────────────────────────
  console.log('\n🏋️   Opening Log Workout modal...');
  try {
    await clickText(page, '+ Log Workout');
    await sleep(3000);
    console.log('📸  Step 6 — Log Workout modal');
    await shot(page, 'addworkout.png');
    await page.keyboard.press('Escape');
    await sleep(800);
  } catch (e) { console.warn('  ⚠️  Log Workout modal:', e.message); }

  // ── 10. Food Log tab ──────────────────────────────────────────────────────
  console.log('\n📋  Navigating to Log Food tab...');
  try {
    await clickText(page, 'Log Food');
    await sleep(2500);
    console.log('📸  Step 7 — Food Log screen');
    await shot(page, 'foodlog.png');
  } catch (e) { console.warn('  ⚠️  Food Log tab:', e.message); }

  // ── 11. Progress tab ──────────────────────────────────────────────────────
  console.log('\n📈  Navigating to Progress tab...');
  try {
    await clickText(page, 'Progress');
    await sleep(3000);
    console.log('📸  Step 8 — Progress screen');
    await shot(page, 'progress.png');
  } catch (e) { console.warn('  ⚠️  Progress tab:', e.message); }

  // ── 12. Profile tab ───────────────────────────────────────────────────────
  console.log('\n👤  Navigating to Profile tab...');
  try {
    await clickText(page, 'Profile');
    await sleep(2500);
    console.log('📸  Step 9 — Profile screen');
    await shot(page, 'profile.png');
  } catch (e) { console.warn('  ⚠️  Profile tab:', e.message); }

  // ── 13. Log a workout then capture workout log ────────────────────────────
  console.log('\n🏠  Back to Home...');
  try {
    await clickText(page, 'Home');
    await sleep(2000);
    await clickText(page, '+ Log Workout');
    await sleep(2000);
    // Select Running
    await clickText(page, 'Running');
    await sleep(400);
    // Fill duration field
    await page.evaluate((val) => {
      const inputs = Array.from(document.querySelectorAll('input:not([readonly])'));
      const durInput = inputs.find(el =>
        el.placeholder === '30' || el.placeholder.toLowerCase().includes('min') || el.placeholder === '45'
      );
      if (durInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(durInput, val);
        durInput.dispatchEvent(new Event('input', { bubbles: true }));
        durInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, '30');
    await sleep(400);
    // Submit workout
    await clickText(page, 'Log Workout');
    await sleep(2500);
    console.log('📸  Step 10 — Workout Log');
    await shot(page, 'workoutlog.png');
  } catch (e) { console.warn('  ⚠️  Workout log:', e.message); }

  // ── 14. Weight chart (Progress tab, scrolled) ────────────────────────────
  console.log('\n⚖️   Capturing weight chart from Progress tab...');
  try {
    await clickText(page, 'Progress');
    await sleep(3000);
    await page.evaluate(() => window.scrollBy(0, 500));
    await sleep(800);
    console.log('📸  Step 11 — Weight Log / Chart');
    await shot(page, 'weightlog.png');
  } catch (e) { console.warn('  ⚠️  Weight log:', e.message); }

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n✨  All screenshots captured!\n');
  console.log('📁  Saved to:', SCREENSHOTS_DIR);
  console.log('\nFiles:');
  fs.readdirSync(SCREENSHOTS_DIR)
    .filter(f => f.endsWith('.png'))
    .forEach(f => console.log(`   • ${f}`));

  await browser.close();
  console.log('\n🎉  Done!\n');
})().catch(async (err) => {
  console.error('\n❌  Script failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
