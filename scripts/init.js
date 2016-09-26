const appModulePath = require('app-module-path');
const app = require('electron').app;
const path = require('path');

const appPath = app.getAppPath();
const scriptsPath = path.join(appPath, 'scripts');

const manifest = require('../package.json');
global.manifest = manifest;

appModulePath.addPath(scriptsPath);
require('main');
