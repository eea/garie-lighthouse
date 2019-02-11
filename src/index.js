const garie_plugin = require('garie-plugin')
const path = require('path');
const config = require('../config');
const express = require('express');
const bodyParser = require('body-parser');
const serveIndex = require('serve-index');

const myGetFile = async (options) => {
    options.fileName = '<my_garie_plugin>.txt';
    const file = await garie_plugin.utils.helpers.getNewestFile(options);
    return getResults(file);
}

const myGetData = async (item) => {
    const { url } = item.url_settings;
    return new Promise(async (resolve, reject) => {
        try {
            const { extra_option } = item.url_settings;
            const { reportDir } = item;

            const options = { script: path.join(__dirname, './my_script.sh'),
                        url: url,
                        reportDir: reportDir,
                        params: [ extra_option ],
                        callback: myGetFile
                    }
            data = await garie_plugin.utils.helpers.executeScript(options);

// my code to get the data for a url

            resolve(data);
        } catch (err) {
            console.log(`Failed to get data for ${url}`, err);
            reject(`Failed to get data for ${url}`);
        }
    });
};



console.log("Start");


const app = express();
app.use('/reports', express.static('reports'), serveIndex('reports', { icons: true }));

const main = async () => {
  garie_plugin.init({
    database:'lighthouse',
    getData:myGetData,
    app_name:'lighthouse-reports',
    app_root: path.join(__dirname, '..'),
    config:config
  });
}

if (process.env.ENV !== 'test') {
  app.listen(3000, async () => {
    console.log('Application listening on port 3000');
    await main();
  });
}
