// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const fs = require('fs');
const path = require('path');

var webview = document.querySelector('#content');

webview.addEventListener("dom-ready", function(){
    fs.readFile(getThemePath("dark"), 'utf-8', function (err, css) {
        if (err) {
            return console.log(err);
        }
        webview.insertCSS(css);
    });
});

function getThemePath (name) {
  return path.join('css/themes', name + '.css');
}
