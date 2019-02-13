const garie_plugin = require('garie-plugin')
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');
const express = require('express');
const bodyParser = require('body-parser');
const serveIndex = require('serve-index');

const { launchChromeAndRunLighthouse, createReport } = require('./utils');

const filterResults = (data = {}) => {
    const { categories = {}, audits = {} } = data;

    const { metrics = {} } = audits;
    const { details = {} } = metrics;
    const { items = [] } = details;
    const metricItems = items[0] || {};

    const report = {};

    for (const categoryName in categories) {
        if (!Object.prototype.hasOwnProperty.call(categories, categoryName)) {
            continue;
        }

        const category = categories[categoryName];
        report[`${category.id}-score`] = Math.round(category.score * 100);
    }
    for (const metricItem in metricItems) {
        if (!Object.prototype.hasOwnProperty.call(metricItems, metricItem)) {
            continue;
        }

        // For now don't report on any observered metrics
        if (metricItem.indexOf('observed') === -1) {
            const metric = metricItems[metricItem];
            report[metricItem] = metricItems[metricItem];
        }
    }

    const auditData = ['errors-in-console', 'time-to-first-byte', 'interactive', 'redirects'];

    auditData.forEach(key => {
        const { rawValue } = audits[key] || {};
        if (rawValue !== undefined) {
            report[key] = rawValue;
        }
    });

    var cleanReport = {};
    Object.keys(report).forEach(key => {
        const rawValue = report[key];
        if (rawValue !== undefined){
            cleanReport[key] = rawValue;
        }
    });
    return cleanReport;
};


const myGetData = async (item) => {
    const { url } = item.url_settings;
    return new Promise(async (resolve, reject) => {
        try {
            const lighthouse =
                (await launchChromeAndRunLighthouse(url, {
                    extends: 'lighthouse:default'
                })) || {};

            console.log(`Successfully got data for ${url}`);

            const { reportDir } = item
            const reportFolder = garie_plugin.utils.helpers.reportDirNow(reportDir);

            const resultsLocation = path.join(reportFolder, `/lighthouse.html`);

            const report = await createReport(lighthouse.lhr);

            fs.outputFile(resultsLocation, report)
                .then(() => console.log(`Saved report for ${url}`))
                .catch(err => {
                     console.log(err)
                });

            const data = filterResults(lighthouse.lhr);
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
