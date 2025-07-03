const chromeLauncher = require('chrome-launcher');

const chromeFlags = [
	'--headless',
	'--no-sandbox',
	'--disable-gpu',
	'--disable-dev-shm-usage',
	'--disable-setuid-sandbox',
	'--no-zygote',
	'--no-first-run',
	'--disable-background-timer-throttling',
	'--disable-backgrounding-occluded-windows',
	'--disable-renderer-backgrounding'
];
// options for simulating a faster internet connection
const lighthouseOptions = {
    throttling: {
        rttMs: 40,
        throughputKbps: 10*1024,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0
    },
    onlyCategories: ['performance']
};


const fasterInternetOptions = {
  throttling: {
    rttMs: 40,
    throughputKbps: 10 * 1024,
    cpuSlowdownMultiplier: 1,
    requestLatencyMs: 0,
    downloadThroughputKbps: 0,
    uploadThroughputKbps: 0  // ✅ typo fixed here
  }
};


const launchChromeAndRunLighthouse = async (url, userConfig = {}, useFasterConnection = false) => {
 const lighthouse = (await import('lighthouse')).default;
  let chrome;
  let result;

  try {
    chrome = await chromeLauncher.launch({ chromeFlags });

    const flags = {
      port: chrome.port,
      output: 'json',
      logLevel: 'info',
    };

    const defaultConfig = {
      preset: 'lighthouse:default',
      settings: {
        onlyCategories: ['performance'],
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