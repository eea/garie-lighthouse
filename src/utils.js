const chromeLauncher = require('chrome-launcher');

// Queue system to prevent parallel execution
let lighthouseQueue = [];
let lighthouseInUse = false;

const waitForLighthouse = async () => {
    return new Promise((resolve) => {
        if (!lighthouseInUse) {
            lighthouseInUse = true;
            resolve();
        } else {
            lighthouseQueue.push(resolve);
        }
    });
};

const releaseLighthouse = () => {
    lighthouseInUse = false;
    if (lighthouseQueue.length > 0) {
        const next = lighthouseQueue.shift();
        lighthouseInUse = true;
        next();
    }
};

const chromeFlags = [
    '--disable-gpu',
    '--headless',
    '--no-zygote',
    '--no-sandbox',
    '--headless',
    '--collect.settings.maxWaitForFcp="450000"'
];

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
    await waitForLighthouse();
    
    let chrome;
    let result = [];
    try {
        chrome = await chromeLauncher.launch({ chromeFlags });

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

        const lighthouse = (await import('lighthouse')).default;
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
    } finally {
        releaseLighthouse();
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