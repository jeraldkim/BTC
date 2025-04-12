const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = 3000;

// Enable CORS to allow frontend requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.get('/scrape', async (req, res) => {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://companiesmarketcap.com/assets-by-market-cap/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for table to load
        await page.waitForSelector('table', { timeout: 5000 });

        const data = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tr'));
            let goldCap = null;
            let bitcoinCap = null;

            for (const row of rows) {
                const name = row.querySelector('td:nth-child(2) a')?.innerText?.toLowerCase();
                const marketCap = row.querySelector('td:nth-child(3)')?.innerText;

                if (name?.includes('gold')) {
                    goldCap = marketCap;
                }
                if (name?.includes('bitcoin')) {
                    bitcoinCap = marketCap;
                }
                if (goldCap && bitcoinCap) break;
            }

            return { goldCap, bitcoinCap };
        });

        await browser.close();

        // Parse market caps (e.g., "$21.857 T" to 21857000000000)
        const parseCap = (cap) => {
            if (!cap) return null;
            const clean = cap.replace(/[$,]/g, '').trim();
            const multiplier = clean.includes('T') ? 1e12 : clean.includes('B') ? 1e9 : 1;
            return parseFloat(clean.replace(/[TBM]/g, '')) * multiplier;
        };

        res.json({
            goldCap: parseCap(data.goldCap),
            bitcoinCap: parseCap(data.bitcoinCap)
        });
    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({ error: 'Failed to scrape data' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
