const {app, nativeTheme, BrowserWindow} = require('electron');
const path = require('path');

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
      if (cachedDarkModeUserScript) {
        window.webContents.executeJavaScript(`${cachedDarkModeUserScript}`);
      } else {
        const { net } = require('electron')
        const getDarkUserScriptRequest = net.request('https://userstyles.org/styles/userjs/171472/duolingo-dark-2022.user.js')
        getDarkUserScriptRequest.on('response', (response) => {
          response.on('data', (chunk) => {
            cachedDarkModeUserScript = `${chunk}`;
            window.webContents.executeJavaScript(`${chunk}`);
          })
        })
        getDarkUserScriptRequest.end();
      }
    });
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
