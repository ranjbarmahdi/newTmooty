import dotenv from 'dotenv';
dotenv.config();

import {
    getBrowser,
    getRandomElement,
    delay,
    checkMemoryCpu,
    getDomain,
    getPage,
    readCsv,
} from './utils.js';
import { DOMAINS } from './enum/enums.js';
import { faradars } from './modules/index.js';
import { insertCourse, insertUrlToProblem, insertUrlToVisited, removeUrl } from './db.js';
import fs from 'fs';

const IMAGES_DIR = './images';
const CATEGORIES_CSV_DIR = './categories.csv';

// ============================================ Main
async function main() {
    let page;
    let price;
    let browser;

    let urlRow;
    try {
        const proxyList = [''];
        const randomProxy = getRandomElement(proxyList);
        browser = await getBrowser(randomProxy, true, false);

        if (!fs.existsSync(IMAGES_DIR)) {
            fs.mkdirSync(IMAGES_DIR);
        }

        const categories = await readCsv(CATEGORIES_CSV_DIR);

        while ((urlRow = await removeUrl()) !== null) {
            console.time('Execution Time');

            if (urlRow?.url) {
                page = await getPage(browser);
                const domain = getDomain(price.url);
                console.log({ domain });

                let data;
                switch (domain) {
                    case DOMAINS.OTAGHAK:
                        data = await faradars(page, urlRow.url, IMAGES_DIR, categories);
                        break;
                    default:
                        console.log('Not Found Domain:', domain);
                        break;
                }

                if (data !== null && data !== undefined) {
                    const insertQueryInput = [
                        data.url,
                        data.title,
                        data.sku,
                        data.description,
                        data.headlines,
                        data.price,
                        data.discount,
                        data.number_of_students,
                        data.duration,
                        data.teacher_name,
                        data.course_type,
                        data.course_level,
                        data.certificate_type,
                        data.education_place,
                        data.categories,
                        data.site_category,
                        data.ai_category_offer,
                    ];

                    await insertCourse(insertQueryInput);
                    await insertUrlToVisited(urlRow?.url);
                }

                // Close the page after processing
                await page.close();
                console.timeEnd('Execution Time');
            }
        }
    } catch (error) {
        console.error('Error in main function:', error);
        await insertUrlToProblem(urlRow?.url);
        if (page) await page.close();
        if (browser) await browser.close();
        process.exit(0);
    }
}

// ============================================ run_1
async function run_1(memoryUsagePercentage, cpuUsagePercentage, usageMemory) {
    if (checkMemoryCpu(memoryUsagePercentage, cpuUsagePercentage, usageMemory)) {
        await main();
    } else {
        const status = `status:
          memory usage = ${usageMemory}
          percentage of memory usage = ${memoryUsagePercentage}
          percentage of cpu usage = ${cpuUsagePercentage}\n`;

        console.log('main function does not run.\n');
        console.log(status);
    }
}

// ============================================ run_2
async function run_2(memoryUsagePercentage, cpuUsagePercentage, usageMemory) {
    let urlExists;

    do {
        urlExists = await getPrice();
        if (urlExists) {
            await run_1(memoryUsagePercentage, cpuUsagePercentage, usageMemory);
        }
    } while (urlExists);
}

run_1(80, 80, 20);
// run_2(80, 80, 20);
