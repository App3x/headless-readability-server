const express = require('express')
const { Readability } = require('@mozilla/readability')
const { JSDOM } = require('jsdom')
const fetch = require('node-fetch')
const createDOMPurify = require('dompurify');

const app = express();
const port = process.env.PORT || 3000;


async function getArticleContent(url) {
    const content = await fetch(`https://lzoioknvwbidrp6zvey5wnf3lu0nijnt.lambda-url.eu-central-1.on.aws?disableImages=true&url=${encodeURIComponent(url)}`, {
        method: 'GET'
    }).then(res => {
        console.log(res)
        return res.json()
    })

    const window = new JSDOM('').window;
    const DOMPurify = createDOMPurify(window);
    const clean = DOMPurify.sanitize(content.result);
    const reader = new Readability(new JSDOM(clean).window.document);
    return reader.parse();
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
        console.error(error)
        res.status(500).json({ error: 'Error processing the request' });
    }
});


app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);
});


