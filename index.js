import path from 'node:path';
import fs from 'node:fs';
import { URL } from 'node:url';

import filenamify from 'filenamify';
import puppeteer from 'puppeteer';
import EasyDl from 'easydl';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';

const PAGES = [
];

const downloadVideo = async (dir, videoUrl) => {
  try {
    let basename = path.basename(URL.parse(videoUrl).pathname);
    if (!basename.endsWith('.mp4')) {
      basename += '.mp4';
    }

    await new EasyDl(
      videoUrl,
      `./${dir}/${basename}`,
      { connections: 5, maxRetry: 5 }
    ).wait();
  } catch (err) {
    console.log("[error downloading video]", videoUrl, err);
  }
};

const downloadImage = async (dir, imageUrl) => {
  try {
    const basename = path.basename(URL.parse(imageUrl).pathname);
    await new EasyDl(
      imageUrl,
      `./${dir}/${basename}`,
      { connections: 1, maxRetry: 1 }
    ).wait();
  } catch (err) {
    console.log("[error downloading image]", imageUrl, err);
  }
};

const processPage = async (browser, url) => {
  const page = await browser.newPage();
  await page.setUserAgent({ userAgent: USER_AGENT });
  await page.goto(url);
  await page.waitForSelector('video');
  await page.waitForSelector('iframe');

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

  return Promise.all(
    imageUrls.map(u => downloadImage(dirName, u)).concat(
      videoUrls.map(u => downloadVideo(dirName, u))
    )
  );
};

const browser = await puppeteer.launch();

for (const page of PAGES) {
  console.log("Start processing", page);
  await processPage(browser, page);
  console.log("Finished processing", page);
  await new Promise(r => setTimeout(r, 2000)); // wait
}

await browser.close();
