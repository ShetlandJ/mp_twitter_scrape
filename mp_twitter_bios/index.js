// Import an out-the-box Javascript package which allows me
// to read files on my local computer
const fs = require('fs')
// Import a package to help me read/write to CSV
const parse = require('csv-parse')

// Import a package which allows me to launch a Chrome instance
const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Create the CSV and key the columns as I'll need to refer
// to them later
const csvWriter = createCsvWriter({
    path: 'mp_results1.csv',
    header: [
        { id: 'mp', title: 'MP' },
        { id: 'party', title: 'Party' },
        { id: 'has_party', title: 'Mentions party'},
        { id: 'bio', title: 'Biography' },
    ]
});

// This function was a double check for me
function contains(target, pattern){
    let str = [];
    // Get a paragraph of text, in this cases, the MP's biography
    // from Twitter, and make it all lowercase.
    const paragraph = target.toLowerCase();

    // Check if it contains any of a group of words that I
    // pass into this function
    pattern.forEach((word) => {
        if (paragraph.includes(word)) {
            str.push(word);
        }
    })

    return str.join(', ');
}

const scraper = (async (mp, handle, party) => {
    const site = `https://www.twitter.com/${handle}`;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(site, {waitUntil: 'load'});

    await page.waitForSelector('div[data-testid="UserDescription"]')
    .catch(() => {
        csvWriter.writeRecords([{
            mp,
            party,
            has_party: null,
            bio: '',
        }]);

        return Promise.resolve();
    });

    const bio = await page.evaluate(() => {
        const text = document.querySelector('[data-testid="UserDescription"]');
        if (!text) {
            return '';
        }

        return text.innerText;
    });

    csvWriter.writeRecords([{
        mp,
        party,
        has_party: contains(
            bio,
            ['conservative', 'labour', 'lib dem', '@libdems', 'liberal democrats', 'lib dems', 'snp', 'scottish national party'])
                .length > 0,
        bio,
    }]);

    await browser.close()
        .then(() => Promise.resolve());
});

fs.readFile('mps.csv', function (err, fileData) {
    parse(fileData, {columns: false, trim: true}, async function(err, rows) {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const index = i;

            if (index !== 0) {
                const mp = row[0];
                const handle = row[1];
                const party = row[2];
                if (index > 110) {
                    await scraper(mp, handle, party);
                    console.log(`${mp} done, ${rows.length - index} to go!`);
                }
            }
        }
    })
});