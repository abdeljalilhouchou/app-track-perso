import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";

/**
 * Notifications, Edge headless against the fixture mock (no device subscribed, no settings
 * stored). Read-only: nothing is switched on, the harness asserts no writes happened.
 */
export async function checkNotifications({ send, evaluate, navigatePage, ready, until: waitUntil, pause, results, profile, output, appPort }) {
  const result = results.notifications = { cases: [], screenshots: [] };
  const until = (check, label, timeout = 20000) => waitUntil(check, label, timeout);
  const size = (width, height = width < 768 ? 844 : 1000) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  const go = async (route) => { await navigatePage(`http://127.0.0.1:${appPort}${route}`); await ready(route.split("?")[0]); };
  const shot = async (name) => {
    await pause(500);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await sharp(Buffer.from(data, "base64")).webp({ quality: 86 }).toFile(path.join(output, `notify-${name}.webp`));
    result.screenshots.push(`notify-${name}.webp`);
  };
  const noOverflow = async (context) => assert.ok(await evaluate("document.documentElement.scrollWidth - innerWidth <= 1"), `No horizontal overflow (${context})`);

  for (const [language, theme, width] of [["fr", "dark", 375], ["fr", "light", 320], ["ar", "dark", 390], ["en", "light", 1440]]) {
    profile.language = language; profile.theme = theme;
    await size(width); await go("/profil/notifications");
    await until(() => evaluate("document.querySelectorAll('[data-notify-kind]').length === 6 && document.querySelector('[data-notify-device-state]')?.textContent !== '…'"), "settings rendered");
    await noOverflow(`${language}/${theme}/${width}`);
    await shot(`${language}-${theme}-${width}`);
    result.cases.push({ language, theme, width });
  }

  profile.language = "fr"; profile.theme = "dark";
  await size(375); await go("/profil/notifications");
  await until(() => evaluate("document.querySelector('[data-notify-device-state]')?.textContent.includes('Désactivées')"), "device off");
  assert.equal(await evaluate("document.querySelector('[data-switch=device]').disabled"), false, "the device switch can be turned on");
  assert.equal(await evaluate("document.querySelector('[data-switch=habits]').disabled"), true, "kinds wait for the device");
  assert.equal(await evaluate("document.querySelector('[data-switch=water]').getAttribute('aria-checked')"), "false", "water off by default");
  assert.equal(await evaluate("document.querySelector('#notify-habits').value"), "20:00", "habits at 20:00");
  assert.equal(await evaluate("document.querySelector('[data-notify-test]').disabled"), true, "no test without a device");
  assert.ok(!(await evaluate("!!document.querySelector('[data-notify-schema]')")), "schema ready");
  await evaluate("document.querySelector('[data-notify-calm]').scrollIntoView({ block: 'center' })");
  await shot("calm-fr-dark-375");

  // Reached from the settings page.
  await go("/profil/parametres");
  await until(() => evaluate("!!document.querySelector('[data-settings-push]')"), "settings link");
  assert.equal(await evaluate("document.querySelector('[data-settings-push]').getAttribute('href')"), "/profil/notifications");

  // The home invite: shown once, "Later" hides it for good.
  await evaluate("localStorage.removeItem('track-perso:push-invite')");
  await go("/dashboard");
  await until(() => evaluate("!!document.querySelector('[data-push-invite]')"), "invite on the home page");
  await evaluate("document.querySelector('[data-push-invite]').scrollIntoView({ block: 'center' })");
  await shot("invite-fr-dark-375");
  await evaluate("document.querySelector('[data-push-later]').click()");
  await until(() => evaluate("!document.querySelector('[data-push-invite]')"), "invite hidden");
  await go("/dashboard");
  await until(() => evaluate("!!document.querySelector('[data-home]')"), "home again");
  await pause(1200);
  assert.equal(await evaluate("!!document.querySelector('[data-push-invite]')"), false, "invite stays hidden");

  // The sending job refuses calls without the secret.
  const status = await fetch(`http://127.0.0.1:${appPort}/api/cron/push`).then((r) => r.status);
  assert.ok(status === 401 || status === 500, `cron route closed (${status})`);
  const wrong = await fetch(`http://127.0.0.1:${appPort}/api/cron/push`, { headers: { Authorization: "Bearer nope" } }).then((r) => r.status);
  assert.ok(wrong === 401 || wrong === 500, `wrong secret refused (${wrong})`);
  result.cronStatus = [status, wrong];
}
