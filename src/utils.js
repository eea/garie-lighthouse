const chromeLauncher = require('chrome-launcher');

const chromeFlags = [
	'--disable-gpu',
	'--headless',
	'--no-zygote',
	'--no-sandbox',
	'--headless',
    '--collect.settings.maxWaitForFcp="450000"'
];

// Mutex system to prevent parallel lighthouse execution
class LighthouseMutex {
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
    this.processQueue();
  }

  processQueue() {
    if (this.running || this.queue.length === 0) return;
    this.running = true;
    const next = this.queue.shift();
    next();
  }
}

const lighthouseMutex = new LighthouseMutex();

const fasterInternetOptions = {
  throttling: {
    rttMs: 40,
    throughputKbps: 10 * 1024,
    cpuSlowdownMultiplier: 1,
    requestLatencyMs: 0,
    downloadThroughputKbps: 0,
    uploadThroughputKbps: 0 
  }
};


const launchChromeAndRunLighthouse = async (url, userConfig = {}, useFasterConnection = false) => {
  // Use mutex to ensure only one lighthouse runs at a time
  await lighthouseMutex.acquire();
  
  const lighthouse = (await import('lighthouse')).default;
  let chrome;
  let result;

  try {
    // Clear any existing performance marks to prevent conflicts
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }

    const uniquePort = Math.floor(Math.random() * 10000) + 9000;
    chrome = await chromeLauncher.launch({ 
      chromeFlags: [...chromeFlags, `--remote-debugging-port=${uniquePort}`, `--user-data-dir=/tmp/chrome-${uniquePort}`],
      port: uniquePort
    });

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
        skipAudits: ['uses-http2'],
        disableStorageReset: true,
        clearStorageTypes: [],
        ...(useFasterConnection ? fasterInternetOptions.throttling : {}),
      },
    };

    const mergedConfig = {
      ...defaultConfig,
      ...userConfig,
    };

    result = await lighthouse(url, flags, mergedConfig);
    await chrome.kill();
    return result;
  } catch (err) {
    console.error('Error appeared while running lighthouse', err);
    if (chrome) {
      try {
        await chrome.kill();
      } catch (e) {
        console.error('Error trying to kill Chrome after failure', e);
      }
    }
    throw err;
  } finally {
    // Always release the mutex
    lighthouseMutex.release();
  }
};
const createReport = async (results) => {
    const { ReportGenerator } = await import('lighthouse/report/generator/report-generator.js');
    return ReportGenerator.generateReportHtml(results);
};


module.exports = {
	launchChromeAndRunLighthouse,
	createReport
}