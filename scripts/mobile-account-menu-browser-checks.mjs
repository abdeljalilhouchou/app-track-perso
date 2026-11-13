import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";

/** Mobile avatar menu: Edge headless, local fixtures only. Never clicks sign out. */
export async function checkMobileAccountMenu({ send, evaluate, navigatePage, ready, until: waitUntil, pause, results, profile, requests, output, appPort }) {
  const result = results.mobileAccountMenu = { cases: [], screenshots: [] };
  const until = (check, label, timeout = 20000) => waitUntil(check, label, timeout);
  const shot = async (name) => {
    await pause(300);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await sharp(Buffer.from(data, "base64")).webp({ quality: 86 }).toFile(path.join(output, `account-menu-${name}.webp`));
    result.screenshots.push(`account-menu-${name}.webp`);
  };
  const key = async (value, code) => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: value, code: value, windowsVirtualKeyCode: code });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: value, code: value, windowsVirtualKeyCode: code });
  };
  const trigger = ".mobile-topbar button[aria-haspopup=menu]";
  const openMenu = async () => { await evaluate(`document.querySelector(${JSON.stringify(trigger)}).click()`); await until(() => evaluate("!!document.querySelector('.mobile-account-menu')"), "menu opened"); await pause(260); };
  await send("Network.setBlockedURLs", { urls: ["https://*"] });
  for (const [language, theme, width] of [["fr", "dark", 390], ["fr", "light", 320], ["ar", "dark", 390]]) {
    profile.language = language; profile.theme = theme;
    await send("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: true });
    await navigatePage(`http://127.0.0.1:${appPort}/dashboard`); await ready("/dashboard");
    await until(() => evaluate(`!!document.querySelector(${JSON.stringify(trigger)})`), "avatar trigger");
    await openMenu();
    const box = JSON.parse(await evaluate("JSON.stringify((()=>{const r=document.querySelector('.mobile-account-menu').getBoundingClientRect();return {left:r.left,right:r.right,vw:innerWidth,items:[...document.querySelectorAll('.mobile-account-menu [role=menuitem]')].map(n=>({text:n.textContent.trim(),h:n.getBoundingClientRect().height}))}})())"));
    assert.equal(box.items.length, 4, "Four destinations");
    assert.ok(box.left >= 0 && box.right <= box.vw, `Menu inside the viewport: ${JSON.stringify(box)}`);
    assert.ok(box.items.every((item) => item.h >= 43.5), `44px targets: ${JSON.stringify(box.items)}`);
    assert.equal(await evaluate("document.activeElement.getAttribute('role')"), "menuitem", "Focus moves into the menu");
    await shot(`${language}-${theme}-${width}`);
    // Escape closes and returns focus to the avatar.
    await key("Escape", 27);
    await until(() => evaluate("!document.querySelector('.mobile-account-menu')"), "closed by Escape");
    assert.equal(await evaluate("document.activeElement.getAttribute('aria-haspopup')"), "menu");
    // A press outside closes.
    await openMenu();
    await evaluate("document.querySelector('main').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))");
    await until(() => evaluate("!document.querySelector('.mobile-account-menu')"), "closed by outside press");
    // Badges destination.
    await openMenu();
    await evaluate("[...document.querySelectorAll('.mobile-account-menu a')].find(a=>a.getAttribute('href')==='/profil#badges').click()");
    await until(() => evaluate("location.pathname==='/profil'&&location.hash==='#badges'&&!!document.getElementById('badges')"), "badges destination");
    await until(() => evaluate("(()=>{const r=document.getElementById('badges').getBoundingClientRect();return r.top>=0&&r.top<innerHeight*0.6})()"), "badges scrolled into view");
    assert.ok(await evaluate("!document.querySelector('.mobile-account-menu')"), "Menu closed after navigation");
    if (width === 390 && language === "fr") await shot("badges-destination");
    await openMenu();
    await evaluate("[...document.querySelectorAll('.mobile-account-menu a')].find(a=>a.getAttribute('href')==='/profil#parametres').click()");
    await until(() => evaluate("location.hash==='#parametres'&&(()=>{const r=document.getElementById('parametres').getBoundingClientRect();return r.top>=0&&r.top<innerHeight*0.6})()"), "settings scrolled into view");
    result.cases.push({ language, theme, width, items: box.items.map((item) => item.text) });
  }
  assert.ok(!requests.some((request) => !["GET", "HEAD"].includes(request.method)), "No writes");
}
