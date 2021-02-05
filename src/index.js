const garie_plugin = require('garie-plugin')
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');

const { launchChromeAndRunLighthouse, createReport } = require('./utils');

const filterResults = (data = {}, fasterInternetConnection) => {
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
            report[metricItem] = metricItems[metricItem];
        }
    }

    const auditData = ['errors-in-console', 'time-to-first-byte', 'interactive', 'redirects'];

    auditData.forEach(key => {
        const { rawValue } = audits[key] || {};
        if ((rawValue !== undefined) && (rawValue !== null)){
            report[key] = rawValue;
        }
    });

    var cleanReport = {};
    Object.keys(report).forEach(key => {
        const rawValue = report[key];
        if (rawValue !== undefined){
            if (fasterInternetConnection === true) {
                cleanReport[key + '_fast'] = rawValue;
            } else {
                cleanReport[key] = rawValue;
            }
        }
    });
    return cleanReport;
};


const getAndParseLighthouseData = async(item, url, fasterInternetConnection) => {

    const lighthouse =
        (await launchChromeAndRunLighthouse(url, {
            extends: 'lighthouse:default'
        }, fasterInternetConnection)) || {};
    
    if (fasterInternetConnection) {
        console.log(`Successfully got fast data for ${url}`);
    } else {
        console.log(`Successfully got default data for ${url}`);
    }

    const { reportDir } = item
    const reportFolder = garie_plugin.utils.helpers.reportDirNow(reportDir);

    let resultsLocation = "";
    if (fasterInternetConnection) {
        resultsLocation = path.join(reportFolder, `/lighthouse_fast.html`);
    } else {
        resultsLocation = path.join(reportFolder, `/lighthouse.html`);
    }

    const report = createReport(lighthouse.lhr);
    fs.outputFile(resultsLocation, report)
    .then(() => console.log(`Saved report for ${url}`))
    .catch(err => {
         console.log(err)
    });

    const data = filterResults(lighthouse.lhr, fasterInternetConnection);
    return data;
}

const myGetData = async (item) => {
    //cleanup core dumps in home - core.[0-9]*
    let regex = /^core[.][0-9]*$/
    fs.readdirSync('.')
      .filter(f => regex.test(f))
      .map(f => fs.removeSync(f))
    
    const { url } = item.url_settings;
    return new Promise(async (resolve, reject) => {
        try {
            console.log("Start:", url);

            const data_fast = await getAndParseLighthouseData(item, url, true);
            const data = await getAndParseLighthouseData(item, url, false);
            const full_data = {
                ...data,
                ...data_fast
            };
            resolve(full_data);

        } catch (err) {
            console.log(`Failed to get data for ${url}`, err);
            reject(`Failed to get data for ${url}`);
        }
    });
};



console.log("Start");


const main = async () => {
  try{
    const { app } = await garie_plugin.init({
      db_name:'lighthouse',
      getData:myGetData,
      report_folder_name:'lighthouse-reports',
      plugin_name:'lighthouse',
      app_root: path.join(__dirname, '..'),
      config:config,
      onDemand: true
    });
    app.listen(3000, () => {
      console.log('Application listening on port 3000');
    });
  }
  catch(err){
    console.log(err);
  }
}

if (process.env.ENV !== 'test') {
  main();
}
