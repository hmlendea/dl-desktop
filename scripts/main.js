const {app, nativeTheme, BrowserWindow} = require('electron');
const path = require('path');
const fs = require('fs');

var cachedDarkModeUserScript = null;

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join('icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      webviewTag: true
    }
  });

  mainWindow.webContents.userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36";
  mainWindow.loadURL('https://duolingo.com');
}

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('browser-window-created', function(e, window) {
  window.setMenu(null);

  if (nativeTheme.shouldUseDarkColors) {
    window.on("page-title-updated", function (e, title) {
      if (!cachedDarkModeUserScript) {
        fs.readFile('styles/dark/main.css', 'utf-8', (err, data) => {
          cachedDarkModeUserScript =
            '(function() {\n' +
            '  var css = "";\n' +
            '  if (false || (document.location.href.indexOf("https://www.duolingo.com/") == 0)) {\n' +
            '    css += [\n';

          var lines = data.split('\n');
          for (var i = 0; i < lines.length; i++){
            cachedDarkModeUserScript +=
              '      \"' + lines[i].replace(/\"/g, "\\\"") + '\",\n';
          }
          
          cachedDarkModeUserScript +=
              '      \"\"\n' +
              '    ].join(\"\\n\");\n' +
              '  }\n' +
              '\n' +
              '  var node = document.createElement("style");\n' +
              '  node.appendChild(document.createTextNode(css));\n' +
              '\n' +
              '  document.documentElement.appendChild(node);\n' +
              '})();\n'
        });
      }

      window.webContents.executeJavaScript(`${cachedDarkModeUserScript}`);
    });
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
