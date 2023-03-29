const express = require('express')
const puppeteer = require("puppeteer");
const { Readability } = require('@mozilla/readability')
const { JSDOM } = require('jsdom')
const chromium = require('@sparticuz/chromium')
const createDOMPurify = require('dompurify');

const app = express();
const port = process.env.PORT || 3000;
let browser
const disableImages = true

async function initBrowser() {
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true
        });

        console.log('Browser launched successfully');
    } catch (error) {
        console.error('Error launching browser:', error);
    }
}

async function getArticleContent(url) {
    console.log('Got request for url:', url);
    if (!browser) {
        console.error('Browser not initialized');
        return;
    }

    let page;
    try {
        page = await browser.newPage();
        if (disableImages) {
            await page.setRequestInterception(true);
            page.on('request', request => {
                if (request.url().endsWith('/__webpack_hmr') ||
                    ['stylesheet', 'image', 'media', 'font'].includes(request.resourceType())
                ) {
                    request.abort();
                } else {
                    request.continue();
                }
            });
            page.on('console', message =>
                    console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
                .on('pageerror', ({ message }) => console.log(message))
                .on('response', response =>
                    console.log(`${response.status()} ${response.url()}`))
                .on('requestfailed', request =>
                    console.log(`${request.failure().errorText} ${request.url()}`))
        }

        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 60000,
        });

        const content = await page.content();
        const window = new JSDOM('').window;
        const DOMPurify = createDOMPurify(window);
        const clean = DOMPurify.sanitize(content);
        const reader = new Readability(new JSDOM(clean).window.document);
        const article = reader.parse();

        await page.close();
        return article;
    } catch (error) {
        console.error('Error:', error);
        if (page) {
            await page.close();
        }
    }
}

app.get('/get', async (req, res) => {
    const url = req.query.url

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is missing' });
    }

    try {
        const article = await getArticleContent(url);
        if (article) {
            res.json({ title: article.title, content: article.content });
        } else {
            res.status(500).json({ error: 'Failed to extract article content' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error processing the request' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    initBrowser();
});


