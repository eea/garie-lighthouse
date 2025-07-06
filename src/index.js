const garie_plugin = require('garie-plugin')
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');

const { getAndParseLighthouseData } = require('./utils');










const myGetData = require('./myGetData');

console.log("Start");


const main = async () => {
  try{
    const { app } = await garie_plugin.init({
      db_name:'lighthouse',
      getData:myGetData,
      report_folder_name:'lighthouse-reports',
      plugin_name:'lighthouse',
      app_root: path.join(__dirname, '..'),
      config:config,
      onDemand: true
    });
    app.listen(3000, () => {
      console.log('Application listening on port 3000');
    });
  }
  catch(err){
    console.log(err);
  }
}

if (process.env.ENV !== 'test') {
  main();
}
