const chromeLauncher = require('chrome-launcher');

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

// Lightweight Chrome launcher - create new instance per request
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
    return await chromeLauncher.launch({ 
      chromeFlags: [...chromeFlags, `--remote-debugging-port=${uniquePort}`],
      port: uniquePort
    });
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
    
    // Aggressively clear large objects from result to reduce memory usage
    if (result && result.lhr) {
      delete result.lhr.artifacts;
      delete result.lhr.configSettings;
      delete result.lhr.i18n;
      delete result.lhr.timing;
      delete result.lhr.stackPacks;
      delete result.lhr.fullPageScreenshot;
    }
    
    return result;
  } catch (err) {
    console.error('Error appeared while running lighthouse', err);
    throw err;
  } finally {
    // Always kill Chrome instance immediately after use
    if (chrome) {
      try {
        await chrome.kill();
      } catch (killErr) {
        console.error('Error killing Chrome:', killErr);
      }
    }
    
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