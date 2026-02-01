import path from 'node:path';
import fs from 'node:fs';
import { URL } from 'node:url';

import filenamify from 'filenamify';
import puppeteer from 'puppeteer';

import { Downloader } from 'nodejs-file-downloader';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';

const ITEM_IDS = JSON.parse(fs.readFileSync("./items.json"));

// already ran 5 + 46
// 46 + 39 = 85
// 85 -> 86
const PAGES = ITEM_IDS.map(it => `https://www.goofish.com/item?id=${it}`).slice(86);

const downloadVideo = async (dir, videoUrl) => {
  try {
    let basename = path.basename(URL.parse(videoUrl).pathname);
    if (!basename.endsWith('.mp4')) {
      basename += '.mp4';
    }

    const downloader = new Downloader({
      url: videoUrl,
      directory: dir,
      fileName: basename,
      cloneFiles: false,
    });

    await downloader.download();
  } catch (err) {
    console.log("[error downloading video]", videoUrl, err);
  }
};

const downloadImage = async (dir, imageUrl) => {
  try {
    const basename = path.basename(URL.parse(imageUrl).pathname);

    const downloader = new Downloader({
      url: imageUrl,
      directory: dir,
      fileName: basename,
      cloneFiles: false,
    });

    await downloader.download();
  } catch (err) {
    console.log("[error downloading image]", imageUrl, err);
  }
};

const processPage = async (browser, url) => {
  const page = await browser.newPage();
  await page.setUserAgent({ userAgent: USER_AGENT });
  await page.goto(url);
  
  try {
    await page.waitForSelector('video', { timeout: 5000 });
  } catch (_) {
    console.log('Error while waiting for video');
  }

  const parsedURL = URL.parse(url);

  const title = (await page.title()).replace(/_闲鱼$/, '').trim();
  const desc = (await page.$eval('[class^="main--"] [class^="desc"]', e => e.textContent)).trim();
  const seller = (await page.$eval('[class^="item-user-info-nick--"]', e => e.textContent)).trim();
  const price = (await page.$eval('[class^="value--"] [class^="price--"]', e => e.textContent)).trim();
  const id = parsedURL.searchParams.get('id');

  const videoUrls = [...new Set(await page.$$eval('video source', xs => xs.map(s => s.getAttribute('src'))))];
  const imageUrls = [...new Set(await page.$$eval(
    'img.ant-image-img',
    xs => xs
      .map(s => s.getAttribute('src'))
  ))].map(s => s.startsWith('//') ? parsedURL.protocol + s : s);

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

  // console.log('id', id);
  // console.log('title', title);
  // console.log('seller', seller);
  // console.log('videoUrls', videoUrls);
  // console.log('imageUrls', imageUrls);

  const dirName = `./contents/${filenamify(`${seller}-${title}`)}`;
  fs.mkdirSync(dirName, { recursive: true });
  fs.writeFileSync(`${dirName}/metadata.txt`, metadata);

  await page.close();

  console.log(`Process downloads for ${seller}-${title}`);
  return Promise.all(
    imageUrls.map(u => downloadImage(dirName, u)).concat(
      videoUrls.map(u => downloadVideo(dirName, u))
    )
  );
};

const browser = await puppeteer.launch();

console.log(`total ${PAGES.length} pages`)

let index = 0;
for (const page of PAGES) {
  console.log(`[${index}] Start processing`, page);
  
  try {
    await processPage(browser, page);
  } catch(ex) {
    console.log("Cannot download", page);
  }

  console.log("Finished processing", page);

  await new Promise(r => setTimeout(r, 2000)); // wait
  index += 1;
}

await browser.close();
