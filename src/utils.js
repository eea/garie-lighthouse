const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const ReportGenerator = require('lighthouse/lighthouse-core/report/report-generator');

const chromeFlags = [
	'--disable-gpu',
	'--headless',
	'--no-zygote',
	'--no-sandbox',
	'--headless'
];

const launchChromeAndRunLighthouse = async (url, config) => {
    return new Promise(async (resolve, reject) => {

        const chrome = await chromeLauncher.launch({ chromeFlags });
        const flags = {
            port: chrome.port,
            output: 'json'
        };

        let result = [];
        try{
            result = await lighthouse(url, flags, config);
            await chrome.kill();
            resolve(result);
        }
        catch(e){
            await chrome.kill();
            reject(e)
        }
        return;
    });
};

const createReport = results => ReportGenerator.generateReportHtml(results);


module.exports = {
	launchChromeAndRunLighthouse,
	createReport
}
