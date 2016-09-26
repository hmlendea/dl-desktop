const appModulePath = require('app-module-path');
const app = require('electron').remote.app;
const path = require('path');

const appPath = app.getAppPath();
const scriptsPath = path.join(appPath, 'scripts');

const manifest = require(path.join(appPath, 'package.json'));
global.manifest = manifest;

appModulePath.addPath(scriptsPath);
require('renderer/main');
