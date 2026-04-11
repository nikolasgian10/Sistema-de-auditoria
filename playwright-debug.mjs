import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('CONSOLE', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGEERROR', err.message));
  page.on('response', res => { if (res.status() >= 400) console.log('RESPONSE', res.status(), res.url()); });
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  const content = await page.content();
  console.log('PAGE_CONTENT_START');
  console.log(content.slice(0,400));
  console.log('PAGE_CONTENT_END');
  await browser.close();
})();
