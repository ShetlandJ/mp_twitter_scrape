const fs = require('fs')
var parse = require('csv-parse')

const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const csvWriter = createCsvWriter({
    path: 'mp_results1.csv',
    header: [
        { id: 'mp', title: 'MP' },
        { id: 'party', title: 'Party' },
        { id: 'has_party', title: 'Mentions party'},
        { id: 'bio', title: 'Biography' },
    ]
});

function contains(target, pattern, party){
    let str = [];
    const paragraph = target.toLowerCase();

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
            ['conservative', 'labour', 'lib dem', 'liberal democrats', 'lib dems', 'snp', 'scottish national party'])
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