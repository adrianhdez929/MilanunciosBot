const fs = require('fs');
const { Cluster } = require('puppeteer-cluster');
const posts = require('./posts.conf');
const axios = require('axios');
const puppeteer = require('puppeteer-core');


module.exports = (async () => {
    
    const formIds = [
        '#titulo',
        '#mapPlaceBox',
        '#texto',
        '#precio',
        '#nombre',
        '#email',
        '#repemail',
        '#telefono1',
        '#photoUploader'
    ];

    const provinces = [
        'Alava', 
        'Albacete', 
        'Alicante', 
        'Almeria', 
        'Asturias', 
        'Avila', 
        'Badajoz', 
        'Barcelona', 
        'Burgos', 
        'Caceres', 
        'Cadiz', 
        'Cantabria', 
        'Castellon', 
        'Ceuta', 
        'Ciudad Real', 
        'Cordoba', 
        'Cuenca', 
        'Girona', 
        'Granada', 
        'Guadalajara', 
        'Guipuzcoa', 
        'Huelva', 
        'Huesca', 
        'Islas Baleares', 
        'Jaen', 
        'A coruña', 
        'La Rioja', 
        'Las Palmas', 
        'Leon', 
        'Lleida', 
        'Lugo', 
        'Madrid', 
        'Malaga', 
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
        maxConcurrency: 5,
        puppeteer: puppeteer,
        puppeteerOptions: {
            executablePath: '/usr/bin/chromium', 
            headless: false, 
            defaultViewport: null,
            args: ['--window-size=800,600']
        },
    });

    await cluster.task(async ({page, data: data}) => {
        await page.goto('https://www.milanuncios.com/textos-del-anuncio/?c=1380&m=1');
        const imageDir = 'images/';
        imageDirData = await fs.readdir(imageDir + (++data.postIndex).toString() + '/', (err, imageData) => {
            imageData.map(async (image, imgIndex) => {
                const fileInputIdentifier = "imageNumber_"+ imgIndex;
                const dropZoneSelector = ".dropzone";
                const filePath = imageDir + data.postIndex + '/' + image;        

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
            });
        });
        
        await page.type('#titulo', data.post.titulo);
        await page.type('#mapPlaceBox', data.province);
        await page.type('#texto', data.post.descripcion);
        await page.type('#precio', data.post.precio);
        await page.type('#nombre', data.post.nombre);
        await page.type('#email', data.post.correo);
        await page.type('#repemail', data.post.correo);
        await page.type('#telefono1', data.post.telefono);
        
        await page.close();
    });

    posts.map((post, postIndex) => {
        provinces.forEach((province) => {
            cluster.queue({
                post: post,
                province: province,
                postIndex: postIndex,
            });
        });
    });

    await cluster.idle();
    await cluster.close();
 })();
