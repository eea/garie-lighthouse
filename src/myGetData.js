const fs = require('fs-extra');
const garie_plugin = require('garie-plugin');
const { getAndParseLighthouseData } = require('./utils');

const myGetData = async (item) => {
    //cleanup core dumps in home - core.[0-9]*
    let regex = /^core[.][0-9]*$/
    fs.readdirSync('.')
      .filter(f => regex.test(f))
      .map(f => fs.removeSync(f))
    
    const { url } = item.url_settings;
    
    // Log memory usage before processing
    const memBefore = process.memoryUsage();
    console.log(`Memory before ${url}: ${Math.round(memBefore.heapUsed / 1024 / 1024)}MB`);
    return new Promise(async (resolve, reject) => {
        try {
            console.log("Start:", url);

            const { reportDir } = item
            const reportFolder = garie_plugin.utils.helpers.reportDirNow(reportDir);

            const data_fast = await getAndParseLighthouseData(item, url, true, reportFolder);
            const data = await getAndParseLighthouseData(item, url, false, reportFolder);

            const full_data = {
                ...data,
                ...data_fast
            };
            
            // Log memory usage after processing
            const memAfter = process.memoryUsage();
            console.log(`Memory after ${url}: ${Math.round(memAfter.heapUsed / 1024 / 1024)}MB`);
            
            resolve(full_data);

        } catch (err) {
            console.log(`Failed to get data for ${url}`, err);
            reject(`Failed to get data for ${url}`);
        }
    });
};

module.exports = myGetData;