const chromeLauncher = require('chrome-launcher');

const chromeFlags = [
	'--disable-gpu',
	'--headless',
	'--no-zygote',
	'--no-sandbox',
	'--headless',
    '--collect.settings.maxWaitForFcp="450000"'
];



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
 const lighthouse = (await import('lighthouse')).default;
  let chrome;
  let result;

  try {
    const uniquePort = Math.floor(Math.random() * 10000) + 9000;
    chrome = await chromeLauncher.launch({ 
      chromeFlags: [...chromeFlags, `--remote-debugging-port=${uniquePort}`],
      port: uniquePort
    });

    const flags = {
      port: chrome.port,
      output: 'json',
      logLevel: 'info',
    };

    const defaultConfig = {
      preset: 'lighthouse:default',
      settings: {
        onlyCategories: ['performance'],
        maxWaitForFcp: 15000,
        maxWaitForLoad: 35000,
        skipAudits: ['uses-http2'],
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