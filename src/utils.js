const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const ReportGenerator = require('lighthouse/lighthouse-core/report/report-generator');

const chromeFlags = [
	'--disable-gpu',
	'--headless',
	'--no-zygote',
	'--no-sandbox',
	'--headless'
];

// options for simulating a faster internet connection
const lighthouseOptions = {
    throttling: {
        rttMs: 40,
        throughputKbps: 10*1024,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbp: 0
    }
};


const launchChromeAndRunLighthouse = async (url, config, fasterInternetConnection) => {
    return new Promise(async (resolve, reject) => {
        const chrome = await chromeLauncher.launch({ chromeFlags });

        let flags = {
            port: chrome.port,
            output: 'json'
        };

        if (fasterInternetConnection === true) {
           flags = {
                ...lighthouseOptions,
                ...flags
            };
        }

        let result = [];
        try{
            result = await lighthouse(url, flags, config);
            await chrome.kill();
            resolve(result);
        }
        catch(e){
            await chrome.kill();
            reject(e)
        }
        return;
    });
};

const createReport = results => ReportGenerator.generateReportHtml(results);


module.exports = {
	launchChromeAndRunLighthouse,
	createReport
}
