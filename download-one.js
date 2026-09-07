import path from 'node:path';
import { URL } from 'node:url';

import cliProgress from 'cli-progress';
import filenamify from 'filenamify';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import { CONTENT_DIR, downloadImage, downloadVideo, isDownloaded, writeDeletedMeta, writeMeta } from './utils.js';

const itemId = process.argv[2];

if (!itemId) {
  process.exit(0);
}

if (isDownloaded(itemId)) {
  console.log(`ALREADY DOWNLOADED`);
  process.exit(0);
}

const userDataDir = '/Users/xianshiwu/Library/Application Support/Google/Chrome for Testing';
const browser = await puppeteer.use(StealthPlugin()).launch({
  headless: false,
  userDataDir,
});
const url = `https://goofish.com/item?id=${itemId}`;
const pages = await browser.pages();
const page = pages[0];

console.log(`START: ${itemId} @ ${url}`);

await page.goto(url);
try {
  await page.waitForSelector(
    '[class^="main--"] [class^="desc"]',
    {
      timeout: 10_000
    }
  );
  console.log('STATUS: NETWORK IDLED');
} catch (ex) {
  console.log('ERROR: CANNOT WAIT FOR main->desc');
}

// check if it is already deleted
const isDeleted = await page.$$eval('[class^="empty-container--"]', (xs) => xs.length > 0);
if (isDeleted) {
  await writeDeletedMeta(itemId);
  await page.close();
  await browser.close();
  console.log(`ITEM IS DELETED`);
  process.exit(1);
}
const parsedURL = URL.parse(url);

const title = (await page.title()).replace(/_闲鱼$/, '').trim();
const desc = (await page.$eval('[class^="main--"] [class^="desc"]', (e) => e.textContent)).trim();
const seller = (await page.$eval('[class^="item-user-info-nick--"]', (e) => e.textContent)).trim();
const price = (await page.$eval('[class^="value--"] [class^="price--"]', (e) => e.textContent)).trim();
const id = parsedURL.searchParams.get('id');

const videoUrls = [...new Set(await page.$$eval('video source', (xs) => xs.map((s) => s.getAttribute('src'))))];
const imageUrls = [
  ...new Set(await page.$$eval('img.ant-image-img', (xs) => xs.map((s) => s.getAttribute('src')))),
].map((s) => (s.startsWith('//') ? parsedURL.protocol + s : s));

const metadata = `
ID: ${id}
TITLE: ${title}
SELLER: ${seller}
PRICE: ${price}

DESC:
${desc}

IMAGES:
${imageUrls}

VIDEOS:
${videoUrls}
  `;

console.table({id, title, seller});

await page.close();

const dirName = `${CONTENT_DIR}/${filenamify(`${seller}-${title}-${id}`)}`;

console.log(`DOWNLOADING FILES TO ${dirName} :`);

const multibar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    format: ' {bar} | {filename} | {value}/{total}',
}, cliProgress.Presets.shades_grey);

const downloads = imageUrls
  .map(url => ({
    type: 'image',
    filename: path.basename(URL.parse(url).pathname),
    url
  }))
  .concat(
    videoUrls.map(url => ({
      type: 'video',
      filename: path.basename(URL.parse(url).pathname),
      url
    }))
  );

const bars = {};

await Promise.all(
  downloads.map(({type, filename, url}) => {
    const fn = type === 'image' ? downloadImage : downloadVideo;

    return fn(dirName, url, (percentage, chunk, remainingSize) => {
      if (!bars[filename]) {
        bars[filename] = multibar.create(remainingSize, 0);
      }

      if (bars[filename].isActive) {
        bars[filename].increment(chunk.length, { filename });
      }
    });
  })
);

multibar.stop();

console.log("\nWRITE META");
await writeMeta(dirName, metadata);

await browser.close();

console.log(`SUCCESS!: ${itemId} \n\n`);
