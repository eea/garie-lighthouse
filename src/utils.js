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

// Strict sequential Chrome launcher with longer delays
class ChromeManager {
  constructor() {
    this.queue = [];
    this.running = false;
  }

  async acquire() {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  release() {
    this.running = false;
    if (global.gc) {
      global.gc();
    }
    this.processQueue();
  }

  processQueue() {
    if (this.running || this.queue.length === 0) return;
    this.running = true;
    const next = this.queue.shift();
    next();
  }

  async createChrome() {
    const uniquePort = Math.floor(Math.random() * 10000) + 9000;
    const chrome = await chromeLauncher.launch({ 
      chromeFlags: [...chromeFlags, `--remote-debugging-port=${uniquePort}`],
      port: uniquePort
    });
    
    console.log(`Started Chrome process ${chrome.pid} on port ${chrome.port}`);
    return chrome;
  }
}

const chromeManager = new ChromeManager();

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


const launchChromeAndRunLighthouse = async (url, userConfig = {}, useFasterConnection = false) => {
  // Use mutex to ensure only one lighthouse runs at a time
  await chromeManager.acquire();
  
  const lighthouse = (await import('lighthouse')).default;
  let chrome;
  let result;

  try {
    // Clear any existing performance marks to prevent conflicts
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }

    // Create fresh Chrome instance for each request
    chrome = await chromeManager.createChrome();

    const flags = {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
    };

    const defaultConfig = {
      preset: 'lighthouse:default',
      settings: {
        maxWaitForFcp: 15000,
        maxWaitForLoad: 35000,
        skipAudits: ['uses-http2', 'screenshot-thumbnails', 'final-screenshot'],
        disableStorageReset: false,
        clearStorageTypes: ['appcache', 'cookies', 'file_systems', 'indexeddb', 'local_storage', 'service_workers', 'websql'],
        ...(useFasterConnection ? fasterInternetOptions.throttling : {}),
      },
    };

    const mergedConfig = {
      ...defaultConfig,
      ...userConfig,
    };

    result = await lighthouse(url, flags, mergedConfig);
    
    // Keep all data for complete HTML reports
    
    return result;
  } catch (err) {
    console.error('Error appeared while running lighthouse', err);
    throw err;
  } finally {
    if (chrome) {
      await chrome.kill();
    }
    chromeManager.release();
  }
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
        
        // Clear report from memory immediately
        let reportCleared = report;
        reportCleared = null;

        const data = filterResults(lighthouse.lhr, fasterInternetConnection);
        
        // Clear lighthouse result from memory immediately after filtering
        if (lighthouse && lighthouse.lhr) {
            lighthouse.lhr = null;
        }
        
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