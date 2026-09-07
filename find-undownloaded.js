import { getPendingItemIds, getDownloadedItemIds } from './utils.js'

const downloaded = new Set(getDownloadedItemIds());
const pending = getPendingItemIds().filter(it => !downloaded.has(it));

pending.forEach(x => console.log(x));