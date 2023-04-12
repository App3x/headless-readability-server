const chromium = require('@sparticuz/chrome-aws-lambda');

exports.handler = async (event, context, callback) => {
  let result = null;
  let browser = null;
    const requestedResources = new Set();

  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

     let page = await browser.newPage();
        if (event.disableImages) {
            await page.setRequestInterception(true);

            page.on('request', request => {
                if (request.url().endsWith('/__webpack_hmr') ||
                    ['stylesheet', 'image', 'media', 'font'].includes(request.resourceType())
                ) {
                    request.abort();
                } else {
                    console.log(`requested ${request.url()}`);
                    requestedResources.add(request.url());
                    request.continue();
                }
            });
            page.on('console', message =>
                    console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
                .on('pageerror', ({ message }) => console.log(message))
                .on('response', response => {
                    requestedResources.delete(response.url());
                    console.log(`${response.status()} ${response.url()}`)})
                .on('requestfailed', request =>
                    console.log(`${request.failure().errorText} ${request.url()}`))
        }
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36')

        await page.goto(event.url, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });

        result = await page.content();   
  } catch (error) {
    return callback(error);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

  return callback(null, result);
};