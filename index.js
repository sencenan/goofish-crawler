import path from 'node:path';
import fs from 'node:fs';
import { URL } from 'node:url';

import filenamify from 'filenamify';
import puppeteer from 'puppeteer';

import { Downloader } from 'nodejs-file-downloader';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';

const ITEM_IDS = JSON.parse(fs.readFileSync("./items.json"));

// find IDs that i have already downded
const getAlreadyDownloaded = () => {
  const dirPath = './contents';
  const files = fs.readdirSync(dirPath);
  const items = [];

  for (const file of files) {
    const filepath = path.join(dirPath, file);
    const stats = fs.statSync(filepath);

    if (stats.isDirectory()) {
      let meta;
      try {
        meta = fs.readFileSync(path.join(filepath, 'metadata.txt')).toString();

        // get id from meta
        const match = /.*ID:(.+)\n.*/g.exec(meta);

        if (match[1] && typeof match[1] === 'string') {
          const id = match[1].trim();
          items.push(id);
        }
      } catch (ex) {
        console.log('NO MEATADATA FOR', filepath);
      }
    }
  }

  return items;
};

let ALREADY = getAlreadyDownloaded();

let PAGES = ITEM_IDS
  .filter(it => ALREADY.indexOf(it) === -1)
  .map(it => `https://www.goofish.com/item?id=${it}`);

let _dead_letters = [];

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
  await page.waitForNetworkIdle({
    concurrency: 1,
    idleTime: 500
  });
  console.log(`waited for ${url} to idle`);

  // try {
  //   await page.waitForSelector('video', { timeout: 10000 });
  // } catch (_) {
  //   console.log('Error while waiting for video');
  // }

  const isDeleted = (await page.$$eval('[class^="empty-container--"]', xs => xs.length > 0));
  if (isDeleted) {
    console.log(`${url} DELETED`);
    return;
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

  console.log('id', id);
  console.log('title', title);
  console.log('seller', seller);
  console.log('desc', desc);
  // console.log('videoUrls', videoUrls);
  // console.log('imageUrls', imageUrls);

  const dirName = `./contents/${filenamify(`${seller}-${title}-${id}`)}`;
  fs.mkdirSync(dirName, { recursive: true });
  fs.writeFileSync(`${dirName}/metadata.txt`, metadata);

  await page.close();

  console.log(`Process downloads for ${dirName}`);
  return Promise.all(
    imageUrls.map(u => downloadImage(dirName, u)).concat(
      videoUrls.map(u => downloadVideo(dirName, u))
    )
  ).catch(ex => {
    console.log(`Error while processing ${dirName}. add to dead letter`, ex);

    _dead_letters.push(url);
  });
};

let index = 0;
while (true) {
  let browser = await puppeteer.launch();

  console.log(`total ${PAGES.length} pages`)

  for (const page of PAGES) {
    console.log(`[${index}] Start processing`, page);

    try {
      await processPage(browser, page);
    } catch (ex) {
      console.log(`Cannot download ${page}`, ex);
      // try {
      //   await browser.close();
      // } catch (_) { }
      // console.log('starting a new browser');
      // browser = await puppeteer.launch();
    }

    console.log("Finished processing", page);

    await new Promise(r => setTimeout(r, 2000)); // wait
    index += 1;
  }

  await browser.close();

  if (_dead_letters.length === 0) {
    break;
  }

  console.log('dead letter not empty. retrying');
  PAGES = _dead_letters;
  _dead_letters = [];
}
