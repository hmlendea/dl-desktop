const appModulePath = require('app-module-path');
const app = require('electron').remote.app;
const path = require('path');

const appPath = app.getAppPath();
const scriptsPath = path.join(appPath, 'scripts');

appModulePath.addPath(scriptsPath);
require('renderer/main');
