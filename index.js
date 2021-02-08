const fs = require('fs');
const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-core');

const generateRandom = () => {
    const charMap = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    for (let i = 0; i < 4; i++) {
        randomString += charMap[Math.floor(Math.random() * charMap.length)];
    }
    return randomString;
}

const getPosts = () => {
    const content = fs.readFileSync('posts.json', 'utf-8');
    const parse = JSON.parse(content)
    let posts = [];
    for (var key in parse) {
        if (parse.hasOwnProperty(key)) {
            var item = parse[key];
            posts.push({
                titulo: item.titulo,
                descripcion: item.descripcion,
                precio: item.precio,
                nombre: item.nombre,
                correo: item.correo,
                telefono: item.telefono,
            });            
        }
    }
    return posts;
};

const uploadPhoto = async (page, postIndex, imageDir, image, imgIndex) => {
    const fileInputIdentifier = "imageNumber_"+ imgIndex;
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

const typePostInfo = async (page, post, province) => {
    await page.type('#titulo', post.titulo + ' ' + generateRandom());
    await page.type('#mapPlaceBox', province);
    await page.type('#texto', post.descripcion);
    await page.type('#precio', post.precio);
    await page.type('#nombre', post.nombre);
    await page.type('#email', post.correo);
    await page.type('#repemail', post.correo);
    await page.type('#telefono1', post.telefono);
    await page.$eval('#acepto_condiciones_uso_y_politica_de_privacidad', el => el.click());
    await page.$eval('input[type="image"]', el => el.click())
};

const submitPost = async (page) => {
    
};

module.exports = (async () => {
    let posts = getPosts();

    const provinces = [
        'A Coruña',
        'Álava',
        'Albacete',
        'Alicante',
        'Almería',
        'Asturias',
        'Ávila',
        'Badajoz',
        'Baleares',
        'Barcelona',
        'Burgos',
        'Cáceres',
        'Cádiz',
        'Cantabria',
        'Castellón',
        'Ceuta',
        'Ciudad Real',
        'Córdoba',
        'Cuenca',
        'Girona',
        'Granada',
        'Guadalajara',
        'Guipúzcoa',
        'Huelva',
        'Huesca',
        'Jaén',
        'La Rioja',
        'Las Palmas',
        'León',
        'Lleida',
        'Lugo',
        'Madrid',
        'Málaga',
        'Melilla',
        'Murcia',
        'Navarra',
        'Ourense',
        'Palencia',
        'Pontevedra',
        'Salamanca',
        'Segovia',
        'Sevilla',
        'Soria',
        'Tarragona',
        'Tenerife',
        'Teruel',
        'Toledo',
        'Valencia',
        'Valladolid',
        'Vizcaya',
        'Zamora',
        'Zaragoza'
    ];

    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 1,
        puppeteer: puppeteer,
        puppeteerOptions: {
            executablePath: '/usr/bin/chromium', 
            headless: false, 
            defaultViewport: null,
            args: ['--window-size=480,360']
        },
    });

    await cluster.task(async ({page, data: data}) => {
        await page.setDefaultNavigationTimeout(60000);
        await page.setDefaultTimeout(60000);
        await page.goto('https://www.milanuncios.com/textos-del-anuncio/?c=1380&m=1');
        const imageDir = 'images/';
        imageDirData = await fs.readdir(imageDir + (++data.postIndex).toString() + '/', (err, imageData) => {
            imageData.map(async (image, imgIndex) => {
                await uploadPhoto(page, data.postIndex, imageDir, image, imgIndex);
            });
        });
        
        await typePostInfo(page, data.post, data.province);

        //submitPost(page);
        
        //await page.close();
        await page.waitForNavigation();
    });

    try {
        posts.map(async (post, postIndex) => {
            provinces.forEach(async (province) => {
                /* cluster.queue({
                    post: post,
                    province: province,
                    postIndex: postIndex,
                }); */
                await cluster.execute({
                    post: post,
                    province: province,
                    postIndex: postIndex,
                });
            });
        });
    } catch(err) {
        console.log(err);
    }

    await cluster.idle();
    await cluster.close();
 })();
