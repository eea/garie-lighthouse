const chromeLauncher = require('chrome-launcher');
const path = require('path');
const fs = require('fs-extra');

const chromeFlags = [
	'--disable-gpu',
	'--headless',
	'--no-zygote',
	'--no-sandbox',
	'--disable-dev-shm-usage',
	'--memory-pressure-off',
	'--disable-features=VizDisplayCompositor',
	'--disable-background-timer-throttling',
	'--disable-background-networking',
	'--disable-backgrounding-occluded-windows',
	'--disable-breakpad',
	'--disable-component-extensions-with-background-pages',
	'--disable-extensions',
	'--disable-features=TranslateUI',
	'--disable-ipc-flooding-protection',
	'--disable-renderer-backgrounding',
	'--force-color-profile=srgb',
	'--metrics-recording-only',
	'--no-first-run',
    '--collect.settings.maxWaitForFcp="450000"'
];

// Simple sequential Chrome management like the old version
let chromeQueue = [];
let chromeInUse = false;

const waitForChrome = async () => {
  return new Promise((resolve) => {
    if (!chromeInUse) {
      chromeInUse = true;
      resolve();
    } else {
      chromeQueue.push(resolve);
    }
  });
};

const releaseChrome = () => {
  chromeInUse = false;
  if (global.gc) {
    global.gc();
  }
  // Process next in queue
  if (chromeQueue.length > 0) {
    const next = chromeQueue.shift();
    chromeInUse = true;
    next();
  }
};

const fasterInternetOptions = {
  throttling: {
    rttMs: 40,
    throughputKbps: 10 * 1024,
    cpuSlowdownMultiplier: 1,
    requestLatencyMs: 0,
    downloadThroughputKbps: 0,
    uploadThroughputKbps: 0 
  },
  // Disable heavy audits for faster connection tests
  skipAudits: ['screenshot-thumbnails', 'final-screenshot', 'full-page-screenshot']
};


const launchChromeAndRunLighthouse = async (url, config, fasterInternetConnection) => {
    await waitForChrome();
    
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
                ...fasterInternetOptions,
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
        releaseChrome();
    }
    
    return result;
};
const createReport = async (results) => {
    const { ReportGenerator } = await import('lighthouse/report/generator/report-generator.js');
    return ReportGenerator.generateReportHtml(results);
};

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


const getAndParseLighthouseData = async(item, url, fasterInternetConnection, reportFolder) => {
    try {
        const lighthouse =
            (await launchChromeAndRunLighthouse(url, {
            extends: 'lighthouse:default',
            settings: {
                onlyCategories: ['performance', 'pwa', 'accessibility', 'best-practices', 'seo']
            }
            }, fasterInternetConnection)) || {};

        if (fasterInternetConnection) {
            console.log(`Successfully got fast data for ${url}`);
        } else {
            console.log(`Successfully got default data for ${url}`);
        }


        let resultsLocation = "";
        if (fasterInternetConnection) {
            resultsLocation = path.join(reportFolder, `/lighthouse_fast.html`);
        } else {
            resultsLocation = path.join(reportFolder, `/lighthouse.html`);
        }

        const report = await createReport(lighthouse.lhr);
        await fs.outputFile(resultsLocation, report);
        console.log(`Saved report for ${url}`);

        const data = filterResults(lighthouse.lhr, fasterInternetConnection);
        
        // Clear lighthouse result from memory immediately after filtering
        if (lighthouse && lighthouse.lhr) {
            lighthouse.lhr = null;
        }
        let lighthouseCleared = lighthouse;
        lighthouseCleared = null;
        
        return data;
    } catch (err) {
        console.log(`Failed to run lighthouse for ${url}`, err);
        throw err;
    }
}

module.exports = {
	launchChromeAndRunLighthouse,
	createReport,
	filterResults,
	getAndParseLighthouseData
}