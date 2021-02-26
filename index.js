const fs = require('fs');
const chromeLauncher = require('chrome-launcher');
const { Cluster } = require('puppeteer-cluster');
const vanillaPuppeteer = require('puppeteer-core');
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const readConfig = () => {
    const content = require('./config.json');
    let configs = [];
    for (let item of content) {
        let { cantidadDeVentanasMaxima: maxConcurrency, browserPath } = item; //alias para destructurar objeto
        configs.push({
            maxConcurrency: item.cantidadDeVentanasMaxima, browserPath
        });
    };
    return configs;
};

const generateRandom = () => {
    const charMap = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    for (let i = 0; i < 4; i++) {
        randomString += charMap[Math.floor(Math.random() * charMap.length)];
    }
    return randomString;
}

const getPosts = () => {
    const content = require('./posts.json');

    let posts = [];
    for (let item of content) {
        let { titulo, descripcion, precio, nombre, correo, telefono } = item;
        posts.push({ titulo, descripcion, precio, nombre, correo, telefono });
    };
    return posts;
};

const uploadPhoto = async (page, postIndex, imageDir, image, imgIndex) => {
    const fileInputIdentifier = "imageNumber_" + imgIndex;
    const dropZoneSelector = ".dropzone";
    const filePath = imageDir + postIndex + '/' + image;
    await page.evaluate((fileInputIdentifier, dropZoneSelector) => {
        document.body.appendChild(Object.assign(
            document.createElement("input"),
            {
                id: fileInputIdentifier,
                type: "file",
                onchange: e => {
                    document.querySelector(dropZoneSelector).dispatchEvent(Object.assign(
                        new Event("drop"),
                        { dataTransfer: { files: e.target.files } }
                    ));
                }
            }
        ));
    }, fileInputIdentifier, dropZoneSelector);
    const fileInput = await page.$(`#${fileInputIdentifier}`);
    await fileInput.uploadFile(filePath);
};

const uploadPhotoNew = async (page, postIndex, imageDir, image) => {
    const fileInputIdentifier = 'input[type=file]';
    const dropZoneSelector = ".dropzone";
    const filePath = imageDir + postIndex + '/' + image;
    const fileInput = await page.$(`#${fileInputIdentifier}`);
    await fileInput.uploadFile(filePath);
};

const typePostInfo = async (page, post, province) => {
    await page.type('#titulo', post.titulo + ' ' + generateRandom());
    await page.type('#mapPlaceBox', province);
    await page.type('#texto', post.descripcion + ' ' + generateRandom());
    await page.type('#precio', post.precio);
    await page.type('#nombre', post.nombre);
    await page.type('#email', post.correo);
    await page.type('#repemail', post.correo);
    await page.type('#telefono1', post.telefono);
    await page.$eval('#acepto_condiciones_uso_y_politica_de_privacidad', el => el.click());
    await page.$eval('input[type="image"]', el => el.click())
};

const provinces = [
    ['A Coruña', 'A Coruña'],
    ['Álava', 'Abecia'],
    ['Albacete', 'Abejuela'],
    ['Alicante', 'Abdet'],
    ['Almería', 'Abla'],
    ['Asturias', 'Aballe'],
    ['Ávila', 'Adanero'],
    ['Badajoz', 'Achero'],
    ['Baleares', 'Alaro'],
    ['Barcelona', 'Barcelona'],
    ['Burgos', 'Ages'],
    ['Cáceres', 'Abadia'],
    ['Cádiz', 'Ahumada'],
    ['Cantabria', 'Acereda'],
    ['Castellón', 'Artana'],
    ['Ceuta', 'Ceuta'],
    ['Ciudad Real', 'Agudo'],
    ['Córdoba', 'Adamuz'],
    ['Cuenca', 'Cuenca'],
    ['Girona', 'Girona / Gerona'],
    ['Granada', 'Granada'],
    ['Guadalajara', 'Guadalajara'],
    ['Guipúzcoa', 'Gudamendi'],
    ['Huelva', 'Cartaya'],
    ['Huesca', 'Bara'],
    ['Jaén', 'Jaén'],
    ['La Rioja', 'Leiva'],
    ['Las Palmas', 'Agualatente'],
    ['León', 'León'],
    ['Lleida', 'Benes'],
    ['Lugo', 'Bagude'],
    ['Madrid', 'Barajas'],
    ['Málaga', 'Arriate'],
    ['Melilla', 'Melilla'],
    ['Murcia', 'Murcia'],
    ['Navarra', 'Navaz'],
    ['Ourense', 'Ouriz'],
    ['Palencia', 'Palencia'],
    ['Pontevedra', 'Pontevedra'],
    ['Salamanca', 'Salamanca'],
    ['Segovia', 'Segovia'],
    ['Sevilla', 'Sevilla'],
    ['Soria', 'San Andres de Soria'],
    ['Tarragona', 'Tarragona'],
    ['Tenerife', 'Teneguia'],
    ['Teruel', 'Teruel'],
    ['Toledo', 'Toledo'],
    ['Valencia', 'Valencia'],
    ['Valladolid', 'Valladolid'],
    ['Vizcaya', 'Villaro'],
    ['Zamora', 'Zamora'],
    ['Zaragoza', 'Zaragoza']
];


module.exports = async () => {
    const chrome = await chromeLauncher.launch();
    const puppeteer = addExtra(vanillaPuppeteer);
    puppeteer.use(StealthPlugin());

    let posts = getPosts();
    let config = readConfig();

    const browserPathConf = config[0].browserPath;
    const maxConcurrencyConf = config[0].maxConcurrency;

    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: maxConcurrencyConf,
        puppeteer: puppeteer,
        puppeteerOptions: {
            executablePath: browserPathConf || '/usr/bin/chromium',
            headless: false,
            defaultViewport: null,
            args: ['--window-size=800,600']
        },
    });

    await cluster.task(async ({ page, data: data }) => {
        const imageDir = 'images/';
        page.setDefaultNavigationTimeout(0);
        page.setDefaultTimeout(0);
        await page.goto('https://www.milanuncios.com/publicar-anuncios-gratis/formulario?c=15');

        try {
            const cookieButton = await page.$('button[data-testid=TcfAccept]');
            await cookieButton.click();
        } catch (err) {
            console.log(err);
        }

        const radio = await page.waitForSelector('#s');
        await radio.click();
        const province = await page.waitForSelector('#province');
        await province.click();
        await province.type('Madrid');
        await province.press('Enter');
        await page.waitForTimeout(3000)
        const municipality = await page.waitForSelector('#municipality');
        await municipality.click();
        await municipality.type('Madrid');
        await municipality.press('Enter');

        await page.type('#title', data.post.titulo + generateRandom());
        await page.type('#description', data.post.descripcion + generateRandom());
        await page.type('#price', data.post.precio);
        await page.type('#name', data.post.nombre);
        await page.type('#email', data.post.correo);
        await page.type('#mainPhone', data.post.telefono);

        await page.evaluate(selector => {
            return document.querySelector(selector).click();
        }, '#terms');

        await page.waitForTimeout(500);

        const submit = await page.$('button[type=submit]');
        submit.click();

        await page.waitForNavigation();

        await page.waitForTimeout(500);

        imageDirData = await fs.readdir(imageDir + (++data.postIndex).toString() + '/', (err, imageData) => {
            imageData.map(async (image, imgIndex) => {
                await uploadPhoto(page, data.postIndex, imageDir, image);
            });
        });

        await page.waitForTimeout(500);

        const post = await page.$$('button[type=button]');
        await post[post.length - 1].click();

        await page.waitForNavigation();
        await page.waitForNavigation();
    });

    try {
        while (true) {
            provinces.forEach(async (province) => {
                posts.map(async (post, postIndex) => {
                    await cluster.execute({
                        post: post,
                        province: province,
                        postIndex: postIndex,
                    });
                });
            });
        }
    } catch (err) {
        console.log(err);
    }

    await cluster.idle();
    await cluster.close();
};
