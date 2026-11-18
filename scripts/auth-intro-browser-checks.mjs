import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";

/**
 * Sign-in / sign-out anatomy intro, Edge headless against the fixture mock.
 * The mock refuses every auth write, so sign-out still redirects (its session is
 * cleared locally) and sign-in fails: that exercises both the full sequence and
 * the early exit on an error.
 */
export async function checkAuthIntro({ send, evaluate, navigatePage, ready, until: waitUntil, pause, results, profile, output, appPort }) {
  const result = results.authIntro = { cases: [], screenshots: [] };
  const until = (check, label, timeout = 30000) => waitUntil(check, label, timeout);
  const shot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await sharp(Buffer.from(data, "base64")).webp({ quality: 86 }).toFile(path.join(output, `auth-intro-${name}.webp`));
    result.screenshots.push(`auth-intro-${name}.webp`);
  };
  const signOut = async () => {
    await evaluate("document.querySelector('.mobile-topbar button[aria-haspopup=menu]').click()");
    await until(() => evaluate("!!document.querySelector('.mobile-account-menu')"), "account menu");
    await evaluate("[...document.querySelectorAll('.mobile-account-menu [role=menuitem]')].at(-1).click()");
    await until(() => evaluate("!!document.querySelector('.anatomy-intro')"), "intro appears on sign-out");
  };

  profile.language = "fr"; profile.theme = "dark";
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigatePage(`http://127.0.0.1:${appPort}/dashboard`); await ready("/dashboard");
  await evaluate("localStorage.removeItem('track-perso:anatomy-intro-seen-v1')");

  // Sign-out clears the session cookie; keep it to sign back in for the second case.
  const { cookies } = await send("Network.getAllCookies");

  // 1. First sign-out on this device: the full sequence.
  await signOut();
  await until(() => evaluate("!!document.querySelector('.anatomy-intro canvas[data-loaded]')"), "model loaded", 60000);
  await pause(1200);
  await shot("assembling");
  // Read the labels as soon as they are up: a fixed wait lands in the turn to the back.
  await until(() => evaluate("[...document.querySelectorAll('.anatomy-intro-label')].filter((l) => l.dataset.on === 'true').length >= 6"), "front labels", 15000);
  const front = await evaluate("[...document.querySelectorAll('.anatomy-intro-label')].filter((l) => l.dataset.on === 'true').map((l) => l.textContent)");
  assert.ok(front.includes("Pectoraux") && !front.includes("Fessiers"), `front muscles only: ${JSON.stringify(front)}`);
  await shot("front");
  await until(() => evaluate("[...document.querySelectorAll('.anatomy-intro-label')].some((l) => l.dataset.on === 'true' && l.textContent === 'Fessiers')"), "back labels", 15000);
  const back = await evaluate("[...document.querySelectorAll('.anatomy-intro-label')].filter((l) => l.dataset.on === 'true').map((l) => l.textContent)");
  assert.ok(!back.includes("Pectoraux"), `front labels hidden from behind: ${JSON.stringify(back)}`);
  await shot("back");
  // The intro holds the screen to its end even though the redirect already landed.
  assert.equal(await evaluate("location.pathname"), "/login", "redirected under the intro");
  assert.ok(await evaluate("!!document.querySelector('.anatomy-intro')"), "intro still showing after the redirect");
  await until(() => evaluate("!!document.querySelector('.anatomy-intro-brand[data-on]')"), "brand", 15000);
  await shot("brand");
  await until(() => evaluate("!document.querySelector('.anatomy-intro')"), "intro leaves at its end", 20000);
  await shot("login-after");
  result.cases.push({ case: "first sign-out plays the full sequence" });

  // 2. Second sign-out: the full sequence plays again, and a tap skips it.
  await send("Network.setCookies", { cookies });
  await navigatePage(`http://127.0.0.1:${appPort}/dashboard`); await ready("/dashboard");
  await signOut();
  await until(() => evaluate("!!document.querySelector('.anatomy-intro canvas[data-loaded]')"), "model loaded again", 60000);
  await until(() => evaluate("location.pathname === '/login'"), "redirect under the short intro");
  const started = Date.now();
  await evaluate("document.querySelector('.anatomy-intro').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))");
  await until(() => evaluate("!document.querySelector('.anatomy-intro')"), "tap skips the intro", 5000);
  result.cases.push({ case: "tap skips", ms: Date.now() - started });

  // 3. A refused sign-in drops the intro so the error can be read.
  await evaluate("const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;const e=document.querySelector('#email'),p=document.querySelector('#password');s.call(e,'qa@example.invalid');e.dispatchEvent(new Event('input',{bubbles:true}));s.call(p,'wrong-password');p.dispatchEvent(new Event('input',{bubbles:true}))");
  await evaluate("document.querySelector('form button[type=submit]').click()");
  await until(() => evaluate("!!document.querySelector('.anatomy-intro')"), "intro starts on sign-in");
  await until(() => evaluate("!document.querySelector('.anatomy-intro') && !!document.querySelector('form .text-danger')"), "error shown, intro gone", 20000);
  await shot("login-error");
  result.cases.push({ case: "refused sign-in cancels the intro" });

  // 4. The login page itself: kept email, announced error, password reveal, language picker, layouts.
  assert.equal(await evaluate("document.querySelector('#email').value"), "qa@example.invalid", "email kept after a refusal");
  assert.ok(await evaluate("document.querySelector('[role=alert]')?.textContent.includes('incorrect')"), "translated error announced");
  assert.equal(await evaluate("document.querySelector('#password').getAttribute('aria-invalid')"), "true", "password marked invalid");
  await evaluate("document.querySelector('[data-login-reveal]').click()");
  assert.equal(await evaluate("document.querySelector('#password').type"), "text", "password can be shown");
  await evaluate("document.querySelector('[data-login-reveal]').click()");
  assert.equal(await evaluate("document.querySelector('#password').type"), "password", "and hidden again");
  assert.equal(await evaluate("document.querySelectorAll('form button[type=submit]').length"), 1, "one submit button");
  assert.ok(await evaluate("document.documentElement.scrollWidth - innerWidth <= 1"), "no horizontal overflow at 390px");
  await evaluate("[...document.querySelectorAll('[data-login-language] [role=radio]')].find((b) => b.lang === 'en').click()");
  await until(() => evaluate("document.querySelector('main h1').textContent === 'Welcome back'"), "login switches to English");
  assert.ok(await evaluate("document.querySelector('[role=alert]').textContent.includes('Wrong email')"), "error follows the language");
  await evaluate("[...document.querySelectorAll('[data-login-language] [role=radio]')].find((b) => b.lang === 'ar').click()");
  await until(() => evaluate("document.documentElement.dir === 'rtl'"), "Arabic turns the page right-to-left");
  assert.ok(await evaluate("document.documentElement.scrollWidth - innerWidth <= 1"), "no overflow in Arabic");
  await shot("login-ar");
  await evaluate("[...document.querySelectorAll('[data-login-language] [role=radio]')].find((b) => b.lang === 'fr').click()");
  await until(() => evaluate("document.documentElement.dir === 'ltr'"), "back to French");
  await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await navigatePage(`http://127.0.0.1:${appPort}/login`);
  await until(() => evaluate("!!document.querySelector('#email')"), "fresh login page");
  await shot("login-375");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await pause(300);
  assert.ok(await evaluate("getComputedStyle(document.querySelector('aside')).display !== 'none'"), "presentation panel on desktop");
  await shot("login-1440");
  await evaluate("localStorage.removeItem('language')");
  result.cases.push({ case: "login page" });
}
