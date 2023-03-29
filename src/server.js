const express = require('express')
const puppeteer = require("puppeteer-core");
const { Readability } = require('@mozilla/readability')
const { JSDOM } = require('jsdom')
const chromium = require('@sparticuz/chromium')

const app = express();
const port = process.env.PORT || 3000;
let browser

async function initBrowser() {
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        console.log('Browser launched successfully');
    } catch (error) {
        console.error('Error launching browser:', error);
    }
}

async function getArticleContent(url) {
    if (!browser) {
        console.error('Browser not initialized');
        return;
    }

    let page;
    try {
        page = await browser.newPage();

        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 30000,
        });

        const content = await page.content();
        const document = new JSDOM(content).window.document;
        const reader = new Readability(document);
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


