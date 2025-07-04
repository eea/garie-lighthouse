const chromeLauncher = require('chrome-launcher');

const chromeFlags = [
	'--disable-gpu',
	'--headless',
	'--no-zygote',
	'--no-sandbox',
	'--disable-dev-shm-usage',
	'--max_old_space_size=4096',
    '--collect.settings.maxWaitForFcp="450000"'
];

// Shared Chrome instance manager
class ChromeManager {
  constructor() {
    this.chrome = null;
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

  async getChrome() {
    if (this.chrome && this.chrome.port) {
      return this.chrome;
    }

    const uniquePort = Math.floor(Math.random() * 10000) + 9000;
    this.chrome = await chromeLauncher.launch({ 
      chromeFlags: [...chromeFlags, `--remote-debugging-port=${uniquePort}`],
      port: uniquePort
    });
    
    return this.chrome;
  }

  async killChrome() {
    if (this.chrome) {
      await this.chrome.kill();
      this.chrome = null;
    }
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
  }
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

    chrome = await chromeManager.getChrome();

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
    return result;
  } catch (err) {
    console.error('Error appeared while running lighthouse', err);
    throw err;
  } finally {
    // Kill Chrome instance after each lighthouse run to prevent memory leaks
    await chromeManager.killChrome();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Always release the mutex
    chromeManager.release();
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