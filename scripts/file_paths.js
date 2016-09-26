const app = require('app')
const path = require('path');

const appPath = app.getAppPath();

/**
 * @return the page's html path
 */
function getPagePath (name) {
  return path.join(appPath, 'html', name + '.html');
}

/**
 * @return the images's png path
 */
function getImagePath (name) {
  return path.join(appPath, 'images', name + '.png');
}

/**
 * @return the theme's css path
 */
function getThemePath (name) {
  return path.join(appPath, 'styles', 'themes', name + '.css');
}

module.exports = {
    getPagePath,
    getImagePath,
    getThemePath
};
