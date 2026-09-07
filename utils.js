import fs from 'node:fs';
import path from 'node:path';

import { Downloader } from 'nodejs-file-downloader';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';

export const CONTENT_DIR = './contents';

export const getPendingItemIds = () => JSON.parse(fs.readFileSync('./items.json'));

export const getDownloadedItemIds = () => {
  const files = fs.readdirSync(CONTENT_DIR);
  const items = [];

  for (const file of files) {
    const filepath = path.join(CONTENT_DIR, file);
    const stats = fs.statSync(filepath);

    if (stats.isDirectory()) {
      let meta;
      try {
        meta = fs.readFileSync(path.join(filepath, 'metadata.txt')).toString();

        // get id from meta
        const match = /.*ID:(.+)\n?.*/g.exec(meta);

        if (match[1] && typeof match[1] === 'string') {
          const id = match[1].trim();
          items.push(id);
        }
      } catch (ex) {
        console.error('getDownloadedItemIds: NO MEATADATA FOR', filepath);
      }
    }
  }

  return items;
};

export const isDownloaded = (itemId) => {
  const files = fs.readdirSync(CONTENT_DIR);
  const items = [];

  for (const file of files) {
    const filepath = path.join(CONTENT_DIR, file);
    const stats = fs.statSync(filepath);

    if (stats.isDirectory()) {
      let meta;
      try {
        meta = fs.readFileSync(path.join(filepath, 'metadata.txt')).toString();

        // get id from meta
        const match = /.*ID:(.+)\n?.*/g.exec(meta);

        if (match && itemId === match[1]) {
          return true;
        }
      } catch (ex) {
        console.error('isDownloaded: NO MEATADATA FOR', filepath);
      }
    }
  }

  return false;
};

export const downloadVideo = async (dir, videoUrl, onProgress) => {
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
      headers: {
        'User-Agent': USER_AGENT
      },
      onProgress: function (percentage, chunk, remainingSize) {
        onProgress && onProgress(percentage, chunk, remainingSize);
      }
    });

    await downloader.download();
  } catch (err) {
    console.error("[error downloading video]", videoUrl, err);
  }
};

export const downloadImage = async (dir, imageUrl, onProgress) => {
  try {
    const basename = path.basename(URL.parse(imageUrl).pathname);

    const downloader = new Downloader({
      url: imageUrl,
      directory: dir,
      fileName: basename,
      cloneFiles: false,
      headers: {
        'User-Agent': USER_AGENT
      },
      onProgress: function (percentage, chunk, remainingSize) {
        onProgress && onProgress(percentage, chunk, remainingSize);
      }
    });

    await downloader.download();
  } catch (err) {
    console.error("[error downloading image]", imageUrl, err);
  }
};

export const writeMeta = async (dir, metadata) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/metadata.txt`, metadata);
};

export const writeDeletedMeta = async (itemId) => {
  const dir = `${CONTENT_DIR}/DELETED-${itemId}`;
  await writeMeta(dir, `ID: ${itemId}`);
};
