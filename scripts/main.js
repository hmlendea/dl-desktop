const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
const shell = electron.shell;
const app = electron.app;
const file_paths = require('file_paths');

let mainWindow;
let webContents;

/**
 * creates the main window of the app
 */
function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    title: global.manifest.productName,
    icon: file_paths.getImagePath('duolingo')})

  webContents = mainWindow.webContents;

  mainWindow.loadURL(file_paths.getPagePath('index'))

  webContents.on('new-window', function(event, url){
    event.preventDefault();
    shell.openExternal(url);
  });

  // disable the menu bar
  mainWindow.setMenu(null);

  // mainWindow events
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// application events
app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// menu bar
const template = [{
  label: 'App',
  submenu: [{
    label: 'Developer tools',
    click(item, focusedWindow) {
      mainWindow.toggleDevTools();
    }
    }, {
      label: 'Exit',
      click(item, focusedWindow) {
        app.quit();
      }
    }]
}];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
