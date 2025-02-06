import { v4 as uuidv4 } from 'uuid';
import {
    convertToEnglishNumber,
    persionMonthToDigit,
    delay,
    waitForCss,
    goTo,
    getCheerio,
} from '../utils.js';
import { insertCourse, insertUrlToProblem, insertUrlToVisited, removeUrl } from './db.js';

export default async function faradars(page, courseURL, imagesDIR, tmootyCategories) {
    let data = {};
    let $;
    try {
        console.log(`======================== Start Scrape From : \n${courseURL}\n`);

        // Go To Url
        await goTo(page, courseURL, 180000);
        await delay(5000);

        $ = await getCheerio(page);

        // Generate uuidv4
        const uuid = uuidv4().replace(/-/g, '');

        data['url'] = courseURL;

        data['title'] = $('ol > li:last-child').length ? $('ol > li:last-child').text().trim() : '';

        data['sku'] = uuid;

        const sessionsElements = await page.$$(
            '#preview > div > div.border-\\[\\#E4E4E7\\] > div > div:first-child:not(.border-b)'
        );

        if (sessionsElements) {
            for (const element of sessionsElements) {
                await element.click();
                await delay(1500);
            }
        }

        $ = await getCheerio();

        data['headlines'] = $('#preview > div > div.border-\\[\\#E4E4E7\\] > div')
            .map((i, e) => {
                const title = `${$(e).find('> div:first-child > div').text()?.trim()} :`;
                const ambients = $(e)
                    .find('> div:last-child > div > div > div > div > span:first-child')
                    .map((i, e) => `${i + 1} - ${$(e).text()?.trim()}`)
                    .get()
                    .join('\n');
                return `${title}\n${ambients}`;
            })
            .get()
            .join('\n\n');

        if (!data['headlines']) {
            let h5 = $('h5:contains("سرفصل")');

            let ul = null;
            if (h5.length) {
                let firstUl = h5.nextAll('ul').eq(0);
                let secondUl = h5.nextAll('ul').eq(1);

                if (firstUl.length) {
                    ul = firstUl;
                } else if (secondUl.length) {
                    ul = secondUl;
                }
            }

            if (ul) {
                data['headlines'] = $(ul)
                    .find('>li')
                    .map((i, e) => {
                        const allText = $(e).text();
                        const ulText = $(e).find('>ul').text();
                        const text = allText.replace(ulText, '');
                        const title = `${text?.trim()} :`;
                        const ambients = $(e)
                            .find('> ul > li')
                            .map((i, e) => `${i + 1} - ${$(e).text()?.trim()}`)
                            .get()
                            .join('\n');
                        return `${title}\n${ambients}`;
                    })
                    .get()
                    .join('\n\n');
            }
        }

        data['description'] = $('.course-html-content > div > p')
            .map((i, e) => $(e).text()?.trim())
            .get()
            .join('\n');

        data['number_of_students'] = '';
        let strongElement = $('div > strong:contains("تعداد دانشجو")');
        let parentDiv = strongElement.parent();
        if (parentDiv.length) {
            let firstDiv = parentDiv.nextAll('div').eq(0);
            if (firstDiv.length) {
                data['number_of_students'] =
                    `${$(firstDiv).text()?.replace('نفر', '')?.trim()} نفر` || '';
            }
        }

        data['duration'] = $('notFound').text()?.trim() || '';
        let strongElement2 = $('div > strong:contains("مدت زمان")');
        let parentDiv2 = strongElement2.parent();
        if (parentDiv2.length) {
            let firstDiv = parentDiv2.nextAll('div').eq(0);
            if (firstDiv.length) {
                data['duration'] = `${$(firstDiv).text()?.trim()}` || '';
            }
        }

        data['teacher_name'] = $('h6').text()?.trim() || '';
        data['course_type'] = $('notFound').text()?.trim() || 'آنلاین';
        data['course_level'] = $('notFound').text()?.trim() || '';
        data['certificate_type'] = $('notFound').text()?.trim() || '';
        data['education_place'] = $('notFound').text()?.trim() || '';

        const categoryString = tmootyCategories.map((row) => row.TermName).join('\n');
        const { machedCategories, aiSuggestedCategories } = await findMatchingCategories(
            data['title'],
            categoryString
        );

        data['categories'] = machedCategories || '';
        data['site_category'] = $('.category-tree__wrapper > a')
            .map((i, e) => $(e).text().trim())
            .get()
            .join(' > ');
        data['ai_category_offer'] = aiSuggestedCategories || '';

        data['price'] = '';
        data['discount'] = '';

        // price_1
        const xpaths = [
            '/html/body/div[1]/div/div[1]/main/div/div/div/div[2]/div[2]/div[2]/div/div[2]/div[1]/div[2]/span/text()',
            '/html/body/div[1]/div/div[1]/main/div/div/div/div[2]/div[2]/div[2]/div/div[2]/div[1]/div[3]/strong/span/text()',
            '/html/body/div[1]/div/div[1]/main/div/div/div[2]/div[2]/div[2]/div/div[2]/div[1]/div[4]/span/text()',
            '/html/body/div[1]/div/div[1]/main/div/div/div[2]/div[2]/div[2]/div/div[2]/div[1]/div[2]/s/text()',
            '/html/body/div[1]/div/div[1]/main/div/div/div[2]/div[2]/div[2]/div/div[2]/div[1]/div[2]/span/text()',
        ];

        if (xpaths.length) {
            // Find Price
            const prices = await getPrice(page, xpaths, true);

            if (prices.length == 0) {
                // data['price'] = 'رایگان';
            } else if (prices.length == 1) {
                data['price'] = prices[0];
            } else {
                data['price'] = prices[0];
                data['discount'] = prices[1];
            }
        }

        // price_2
        // const offPercent = $('notFound').get()
        // if (offPercent.length) {
        //      data["price"] = $('notFound').text().replace(/[^\u06F0-\u06F90-9]/g, "")
        //      data["xpath"] = "";
        // }
        // else {
        //      data["price"] = $('notFound').first().text().replace(/[^\u06F0-\u06F90-9]/g, "");
        //      data["xpath"] = '';
        // }

        // specification, specificationString

        // Download Images
        const image_xpaths = [];
        let imageUrls = await Promise.all(
            image_xpaths.map(async (_xpath) => {
                try {
                    await page.waitForXPath(_xpath, { timeout: 5000 });
                } catch (error) {}

                const imageElements = await page.$x(_xpath);

                // Get the src attribute of each image element found by the XPath
                const srcUrls = await Promise.all(
                    imageElements.map(async (element) => {
                        let src = await page.evaluate(
                            (el) => el.getAttribute('src')?.replace(/(-[0-9]+x[0-9]+)/g, ''),
                            element
                        );
                        return src;
                    })
                );

                return srcUrls;
            })
        );

        imageUrls = imageUrls.flat();
        imageUrls = [...new Set(imageUrls)];
        await downloadImages(imageUrls, imagesDIR, uuid);

        // download pdfs
        let pdfUrls = $('NotFound')
            .map((i, e) => $(e).attr('href'))
            .get()
            .filter((href) => href.includes('pdf'));
        pdfUrls = Array.from(new Set(pdfUrls));
        for (let i = 0; i < pdfUrls.length; i++) {
            try {
                const pdfUrl = pdfUrls[i];
                const response = await fetch(pdfUrl);
                if (response.ok) {
                    const buffer = await response.buffer();
                    const localFileName = `${uuid}-${i + 1}.pdf`;
                    const documentDir = path.normalize(documentsDir + '/' + localFileName);
                    fs.writeFileSync(documentDir, buffer);
                }
            } catch (error) {
                console.log('Error In Download Documents', error);
            }
        }

        // Returning The Required Data For Excel
        const courseDataObject = {
            url: data['url'],
            title: data['title'],
            sku: data['sku'],
            description: data['description'],
            headlines: data['headlines'],
            price: data['price'],
            discount: data['discount'],
            number_of_students: data['number_of_students'],
            duration: data['duration'],
            teacher_name: data['teacher_name'],
            course_type: data['course_type'],
            course_level: data['course_level'],
            certificate_type: data['certificate_type'],
            education_place: data['education_place'],
            categories: data['categories'],
            site_category: data['site_category'],
            ai_category_offer: data['ai_category_offer'],
        };

        return courseDataObject;
    } catch (error) {
        await insertUrlToProblem(courseURL);
        console.log('Error In scrapCalendar in page.goto', error);
    } finally {
        return data;
    }
}
