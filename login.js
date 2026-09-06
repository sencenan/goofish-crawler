import puppeteer from 'puppeteer';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';
const userDataDir = '/Users/xianshiwu/Library/Application Support/Google/Chrome for Testing';

(async () => {
    // Launch the browser in non-headless mode to see it
    const browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      userDataDir
    });

    const page = await browser.newPage();
    await page.setUserAgent({ userAgent: USER_AGENT });
    await page.goto('https://www.goofish.com');
    
    // Perform other operations with the page here...
    
    // *** OMIT browser.close() ***
    // The script will exit when all other tasks are done, but the browser process might
    // persist if not explicitly managed by the OS or an inactivity timeout.
    
    console.log('Browser opened. To close manually, terminate the Node.js process.');
})();
