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
    },
    onlyCategories: ['performance']
};


const launchChromeAndRunLighthouse = async (url, config, fasterInternetConnection) => {
    let chrome;
    let result = [];
    try {
        chrome = await chromeLauncher.launch({ chromeFlags });

        let flags = {
            //logLevel: 'debug',	
            port: chrome.port,
            output: 'json'
        };

        if (fasterInternetConnection === true) {
            flags = {
                ...lighthouseOptions,
                ...flags
            };
        }

        result = await lighthouse(url, flags, config);
        await chrome.kill();
    } catch (err) {
        console.log("Error appeared while running lighthouse", err);
        try {
            if (chrome !== undefined) {
                await chrome.kill();
            }
        } catch(e) {
            console.log("Error appeared after lighthouse crashed and tried to kill chrome", e);
        }
        throw err;
    }
    return result;
};

const createReport = results => ReportGenerator.generateReportHtml(results);


module.exports = {
	launchChromeAndRunLighthouse,
	createReport
}
