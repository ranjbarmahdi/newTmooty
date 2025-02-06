import dotenv from 'dotenv';
dotenv.config();

import puppeteer from 'puppeteer';
import os from 'os';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';

// Base URL for the API
const baseURL = 'https://api.avalai.ir/v1';

// Create an instance of OpenAI with the API key and base URL
const openai = new OpenAI({
    apiKey: process.env.AVALAI_API_KEY,
    baseURL: baseURL,
});

// ==================================== readCsv
export async function readCsv(csvFilePath) {
    return new Promise((res, rej) => {
        const result = [];
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => result.push(data))
            .on('end', () => {
                console.log(`CSV file ${path.basename(csvFilePath)} read successfully`);
                res(result);
            })
            .on('error', (err) => {
                console.log('Eror in readCsv function :', err);
                rej(err);
            });
    });
}

// ==================================== writeCsv
export async function writeCsv(data, csvFilePath) {
    return new Promise((res, rej) => {
        try {
            const keys = Object.keys(data[0]);
            const csvWriter = createObjectCsvWriter({
                path: csvFilePath,
                header: keys.map((key) => ({ id: key, title: key })),
            });
            csvWriter
                .writeRecords(data)
                .then(() => {
                    console.log(`CSV file written successfully`);
                    res();
                })
                .catch((error) => {
                    console.error(`Error writing CSV `, error);
                    rej(error);
                });
        } catch (error) {
            rej(error);
        }
    });
}

// ==================================== isNumeric
export const isNumeric = (string) => /^[+-]?\d+(\.\d+)?$/.test(string);

// ==================================== click
export function persionMonthToDigit(month) {
    const months = [
        'فروردین',
        'ازدیبهشت',
        'خرداد',
        'تیر',
        'مرداد',
        'شهریور',
        'مهر',
        'آبان',
        'آذر',
        'دی',
        'بهمن',
        'اسفند',
    ];
    return months.indexOf(month) + 1;
}

// ========================================= getDomain
export function getDomain(url) {
    try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.replace(/^www./, '');
        return hostname;
    } catch (error) {
        console.error('Invalid URL:', error);
        return null;
    }
}

//============================================ Download Images
export async function downloadImages(imagesUrls, imagesDIR, uuid) {
    for (let i = 0; i < imagesUrls.length; i++) {
        try {
            const imageUrl = imagesUrls[i];
            const response = await fetch(imageUrl);

            if (response.status === 200) {
                const buffer = await response.buffer();

                // Determine image type based on URL
                let imageType = '.jpg'; // default
                const imageExtensionMatch = imageUrl.match(
                    /\.(jpg|jpeg|png|webp|gif|bmp|tiff|svg|ico)$/i
                );
                if (imageExtensionMatch) {
                    imageType = imageExtensionMatch[0];
                }

                // Generate uuidv4
                const localFileName = `${uuid}-${i + 1}${imageType}`;
                const imageDir = path.normalize(path.join(imagesDIR, localFileName));
                fs.writeFileSync(imageDir, buffer);
            }
        } catch (error) {
            console.log('Error In Download Images', error);
        }
    }
}

// ==================================== click
export async function click(page, selector) {
    try {
        let elements = await page.$$(selector);
        if (elements?.length) {
            let element = elements[0];
            await element.click();
        }
    } catch (error) {
        console.log('Error in click function :', error);
    }
}

//============================================ scrollToEnd
export async function scrollToEnd(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 3;
            const maxScrolls = 9999999; // You can adjust the number of scrolls

            const scrollInterval = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                // Stop scrolling after reaching the bottom or a certain limit
                if (totalHeight >= scrollHeight || totalHeight >= distance * maxScrolls) {
                    clearInterval(scrollInterval);
                    resolve();
                }
            }, 20); // You can adjust the scroll interval
        });
    });
}

//============================================ scrollModal
export const scrollModal = async (page, modalSelector, scrollAmount = 1, waitTime = 20) => {
    const modal = await page.$(modalSelector);
    if (!modal) {
        console.error(`Modal with selector "${modalSelector}" not found.`);
        return;
    }

    await page.evaluate(
        async (modalSelector, scrollAmount, waitTime) => {
            const modal = document.querySelector(modalSelector);
            if (!modal) {
                console.error(`Modal with selector "${modalSelector}" not found in the DOM.`);
                return;
            }

            await new Promise((resolve) => {
                let totalScrolled = 0;
                const scrollInterval = setInterval(() => {
                    const { scrollTop, scrollHeight, clientHeight } = modal;

                    // Scroll the modal by the specified amount
                    modal.scrollBy(0, scrollAmount);
                    totalScrolled += scrollAmount;

                    // Stop scrolling if the bottom of the modal is reached
                    if (scrollTop + clientHeight >= scrollHeight) {
                        clearInterval(scrollInterval);
                        resolve();
                    }
                }, waitTime); // Wait between scrolls
            });
        },
        modalSelector,
        scrollAmount,
        waitTime
    );

    console.log('Modal scrolling completed.');
};

//============================================ choose a random element from an array
export const getRandomElement = (array) => {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
};

//============================================ Login
export async function login(page, url, userOrPhone, pass) {
    try {
        await page.goto(url, { timeout: 360000 });

        let u = '09376993135';
        let p = 'hd6730mrm';
        // sleep 5 second
        console.log('-------sleep 5 second');
        await delay(5000);

        // load cheerio
        const html = await page.content();
        const $ = cheerio.load(html);

        const usernameInputElem = await page.$$('input#username');
        await page.evaluate((e) => (e.value = '09376993135'), usernameInputElem[0]);
        await delay(3000);

        const continueElem = await page.$$('.register_page__inner > button[type=submit]');
        await continueElem[0].click();
        await delay(3000);

        const passwordInputElem = await page.$$('input#myPassword');
        await passwordInputElem[0].type('hd6730mrm');
        // await page.evaluate((e) => e.value = "hd6730mrm" ,passwordInputElem[0]);
        await delay(3000);

        const enterElem = await page.$$('.register_page__inner > button[type=submit]');
        await enterElem[0].click();
        await delay(3000);
    } catch (error) {
        console.log('Error In login function', error);
    }
}

//============================================ convert To English Number
export function convertToEnglishNumber(inputNumber) {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const persianDecimalPoint = '،'; // Persian decimal point

    // Check if the input contains Persian numbers or decimal point
    const containsPersianNumber = new RegExp([
        `${persianNumbers.join('')}${persianDecimalPoint}`,
    ]).test(inputNumber);

    if (containsPersianNumber) {
        // Convert Persian numbers to English numbers
        for (let i = 0; i < 10; i++) {
            const persianDigit = new RegExp(persianNumbers[i], 'g');
            inputNumber = inputNumber.replace(persianDigit, i.toString());
        }

        // Convert Persian decimal point to English decimal point
        inputNumber = inputNumber.replace(new RegExp(persianDecimalPoint, 'g'), '.');

        return inputNumber;
    } else {
        // Input is already an English number, return as is
        return inputNumber;
    }
}

// ============================================ getBrowser
export const getBrowser = async (proxyServer, headless = true, withProxy = true) => {
    try {
        const args = (withProxy) => {
            if (withProxy == true) {
                return [
                    '--disable-notifications',
                    '--no-sandbox',
                    '--disable-infobars',
                    '--disable-setuid-sandbox',
                    '--disable-popup-blocking',
                    `--proxy-server=${proxyServer}`,
                ];
            } else {
                return ['--no-sandbox', '--disable-setuid-sandbox'];
            }
        };
        // Lunch Browser
        const browser = await puppeteer.launch({
            headless: headless, // Set to true for headless mode, false for non-headless
            executablePath:
                process.env.NODE_ENV === 'production'
                    ? process.env.PUPPETEER_EXECUTABLE_PATH
                    : puppeteer.executablePath(),
            args: args(withProxy),
            protocolTimeout: 6000000,
        });

        return browser;
    } catch (error) {
        console.log('Error in getBrowserWithProxy function', error);
    }
};

// ============================================ getPage
export const getPage = async (browser) => {
    const page = await browser.newPage();

    // const context = await browser.createIncognitoBrowserContext();
    // const page = await context.newPage();

    // await page.evaluateOnNewDocument(() => {
    //     window.Notification.requestPermission = () => Promise.resolve('denied');
    // });

    // await page.setRequestInterception(true);

    // page.on('request', (req) => {
    //     if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
    //         req.abort();
    //     } else {
    //         req.continue();
    //     }
    // });

    await page.setViewport({ width: 1440, height: 810 });

    return page;
};

// ============================================ delay
export const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// ============================================ shuffleArray
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ============================================ checkMemoryUsage
export function checkMemoryUsage() {
    const totalMemory = os.totalmem();
    const usedMemory = os.totalmem() - os.freemem();
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    return memoryUsagePercent;
}

// ============================================ getCpuUsagePercentage
export function getCpuUsagePercentage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
        for (let type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    });

    return (1 - totalIdle / totalTick) * 100;
}

// ============================================ checkMemoryCpu
export async function checkMemoryCpu(memoryUsagePercent, cpuUsagePercent, memoryUsageGig) {
    const usageMemory = (os.totalmem() - os.freemem()) / (1024 * 1024 * 1024);
    const memoryUsagePercentage = checkMemoryUsage();
    const cpuUsagePercentage = getCpuUsagePercentage();

    const cond_1 = memoryUsagePercentage <= memoryUsagePercent;
    const cond_2 = cpuUsagePercentage <= cpuUsagePercent;
    const cond_3 = usageMemory <= memoryUsageGig;
    return cond_1 && cond_2 && cond_3;
}

// ============================================ findMatchingCategories
export async function findMatchingCategories(courseName, categories) {
    let machedCategories;
    let aiSuggestedCategories;

    const prompt =
        `Given the course name '${courseName}', check which of the following categories it fits into:\n` +
        `${categories}\n` +
        "Respond with the list of matching categories(just category name), each on a separate line. If no categories match, respond with 'None'.";

    const categoryAiOfferPrompt = `برای دوره '${courseName}' حداکثر 10 دسته بندی مرتبط پیشنهاد بده. دسته بندی‌ها را به صورت زیر هم و بدون شماره گذاری و خط تیره و ... نمایش بده`;

    try {
        const chatCompletion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'gpt-4o-mini',
        });

        machedCategories = chatCompletion.choices[0].message.content;

        if (machedCategories.includes('None')) {
            const chatCompletion = await openai.chat.completions.create({
                messages: [{ role: 'user', content: categoryAiOfferPrompt }],
                model: 'gpt-4o-mini',
            });

            aiSuggestedCategories = chatCompletion.choices[0].message.content || '';
        }

        return { machedCategories, aiSuggestedCategories };
    } catch (error) {
        throw new Error('Open Ai Error');
    }
}

// ============================================ findMinPrice
export async function getPrice(page, xpaths, currency) {
    const prices = [];
    try {
        // Find Price
        for (const _xpath of xpaths) {
            try {
                const priceElements = await page.$x(_xpath);
                if (priceElements.length) {
                    let priceText = await page.evaluate(
                        (elem) => elem.textContent?.replace(/[^\u06F0-\u06F90-9]/g, ''),
                        priceElements[0]
                    );
                    priceText = convertToEnglishNumber(priceText);
                    let priceNumber = currency ? Number(priceText) : Number(priceText) * 10;
                    if (priceNumber !== 0) {
                        prices.push(priceNumber);
                    }
                }
            } catch (error) {
                console.log('Error in getPrice Function Foor Loop :', error.message);
            }
        }
    } catch (error) {
        console.log('Error In getPrice :', error);
    } finally {
        prices = Array.from(new Set(prices));
        return prices.sort((a, b) => b - a);
    }
}

// ============================================ findMinPrice
export async function waitForCss(cssSelector, timeout = 5000) {
    try {
        await page.waitForSelector(cssSelector, { timeout });
        console.log('Selector found');
    } catch (error) {
        console.error('Selector not found');
    }
}

// ============================================ goTo
export async function goTo(page, url, timeout = 60000) {
    await page.goto(url, { timeout });
}

// ============================================ getCheerio
export async function getCheerio(page) {
    let html = await page.content();
    let $ = cheerio.load(html);
    return $;
}
