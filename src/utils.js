const chromeLauncher = require('chrome-launcher');

const chromeFlags = [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--no-zygote',
  '--no-default-browser-check',
  '--disable-features=TranslateUI',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--ignore-certificate-errors',
  '--allow-insecure-localhost',
  '--disable-web-security',
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
    const lighthouse = (await import('lighthouse')).default;
    let chrome;
    let result = [];
    try {
        chrome = await chromeLauncher.launch({ chromeFlags });

            let flags = {
        port: chrome.port,
        output: 'json',
        disableStorageReset: false,
        maxWaitForFcp: 15000,
        maxWaitForLoad: 35000,
        formFactor: 'desktop',
        screenEmulation: { disabled: true },
        disableDeviceEmulation: true,
        onlyCategories: ['performance']
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

const createReport = async (results) => {
    const { ReportGenerator } = await import('lighthouse/report/generator/report-generator.js');
    return ReportGenerator.generateReportHtml(results);
};


module.exports = {
	launchChromeAndRunLighthouse,
	createReport
}
