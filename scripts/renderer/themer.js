const fs = require('fs');
const file_paths = require('file_paths');

const webview = document.querySelector('#content');

/**
 * applies a theme on the app
 */
function applyTheme (name) {
    webview.addEventListener('dom-ready', function(){
        fs.readFile(file_paths.getThemePath(name), 'utf-8', function (err, css) {
            if (err) {
                return console.log(err);
            }
            webview.insertCSS(css);
        });
    });
}

module.exports = {
    applyTheme
};
