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

const throttlingConfig = {
  throttling: {
    rttMs: 40,
    throughputKbps: 10 * 1024,
    cpuSlowdownMultiplier: 1,
    requestLatencyMs: 0,
    downloadThroughputKbps: 0,
    uploadThroughputKbps: 0,
  }
};

const lighthouseFlags = {
  output: 'json',
  onlyCategories: ['performance'],
  logLevel: 'info',
};

const launchChromeAndRunLighthouse = async (url, userConfig = {}, useFasterConnection = false) => {
  const lighthouse = (await import('lighthouse')).default;
  let chrome;

  try {
    chrome = await chromeLauncher.launch({ chromeFlags });

    const flags = {
      port: chrome.port,
      ...lighthouseFlags,
      ...(useFasterConnection ? throttlingConfig : {})
    };

    // Add default preset if not set
    const config = {
      preset: 'lighthouse:default',
      ...userConfig,
    };

    const result = await lighthouse(url, flags, config);
    await chrome.kill();
    return result;
  } catch (err) {
    console.error('Error running Lighthouse:', err);
    if (chrome) await chrome.kill();
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
};
