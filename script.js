// Constants
const BITCOIN_GROWTH_RATE = 0.5; // 50% annual growth (simplified)
const GOLD_GROWTH_RATE = 0.05; // 5% annual growth (simplified)
const SECONDS_PER_YEAR = 31536000;
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/'; // Free CORS proxy
const TARGET_URL = 'https://companiesmarketcap.com/assets-by-market-cap/';

// DOM Elements
const goldCapElement = document.getElementById('gold-cap');
const bitcoinCapElement = document.getElementById('bitcoin-cap');
const countdownElement = document.getElementById('countdown');

// Format numbers as USD
function formatUSD(value) {
    if (!value) return 'Error';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
    }).format(value);
}

// Parse market cap (e.g., "$21.857 T" to 21857000000000)
function parseCap(cap) {
    if (!cap) return null;
    const clean = cap.replace(/[$,]/g, '').trim();
    const multiplier = clean.includes('T') ? 1e12 : clean.includes('B') ? 1e9 : 1;
    return parseFloat(clean.replace(/[TBM]/g, '')) * multiplier;
}

// Scrape data
async function scrapeData() {
    try {
        const response = await fetch(CORS_PROXY + TARGET_URL, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const rows = doc.querySelectorAll('table tr');
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

        return {
            goldCap: parseCap(goldCap),
            bitcoinCap: parseCap(bitcoinCap)
        };
    } catch (error) {
        console.error('Scraping error:', error);
        return { goldCap: null, bitcoinCap: null };
    }
}

// Calculate time to overtake
function calculateTimeToOvertake(goldCap, bitcoinCap) {
    if (!goldCap || !bitcoinCap || bitcoinCap >= goldCap) {
        return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const relativeGrowthRate = BITCOIN_GROWTH_RATE - GOLD_GROWTH_RATE;
    const ratio = goldCap / bitcoinCap;
    const years = Math.log(ratio) / Math.log(1 + relativeGrowthRate);

    if (years <= 0) return null;

    const totalSeconds = years * SECONDS_PER_YEAR;
    const yearsInt = Math.floor(totalSeconds / SECONDS_PER_YEAR);
    let remainder = totalSeconds % SECONDS_PER_YEAR;
    const months = Math.floor(remainder / (SECONDS_PER_YEAR / 12));
    remainder %= SECONDS_PER_YEAR / 12;
    const days = Math.floor(remainder / 86400);
    remainder %= 86400;
    const hours = Math.floor(remainder / 3600);
    remainder %= 3600;
    const minutes = Math.floor(remainder / 60);
    const seconds = Math.floor(remainder % 60);

    return { years: yearsInt, months, days, hours, minutes, seconds };
}

// Format countdown
function formatCountdown(time) {
    if (!time) return 'Calculating...';
    if (time.years === 0 && time.months === 0 && time.days === 0 &&
        time.hours === 0 && time.minutes === 0 && time.seconds === 0) {
        return 'Bitcoin has overtaken Gold!';
    }
    return `${time.years}y ${time.months}m ${time.days}d ${time.hours}h ${time.minutes}m ${time.seconds}s`;
}

// Update UI
async function updateData() {
    const data = await scrapeData();

    if (data.goldCap) {
        goldCapElement.textContent = formatUSD(data.goldCap);
    } else {
        goldCapElement.textContent = 'Error fetching data';
    }

    if (data.bitcoinCap) {
        bitcoinCapElement.textContent = formatUSD(data.bitcoinCap);
    } else {
        bitcoinCapElement.textContent = 'Error fetching data';
    }

    if (data.goldCap && data.bitcoinCap) {
        const time = calculateTimeToOvertake(data.goldCap, data.bitcoinCap);
        countdownElement.textContent = formatCountdown(time);
    } else {
        countdownElement.textContent = 'Error';
    }
}

// Initial update and set interval
updateData();
const interval = setInterval(() => {
    updateData().then(() => {
        // Stop interval if Bitcoin overtakes Gold
        if (bitcoinCapElement.textContent !== 'Loading...' &&
            goldCapElement.textContent !== 'Loading...' &&
            bitcoinCapElement.textContent !== 'Error fetching data' &&
            parseFloat(bitcoinCapElement.textContent.replace(/[^0-9.]/g, '')) >=
            parseFloat(goldCapElement.textContent.replace(/[^0-9.]/g, ''))) {
            clearInterval(interval);
        }
    });
}, 60000); // Update every 60 seconds
