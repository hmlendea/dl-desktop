const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const shell = electron.shell;
const Menu = require('electron').Menu

let mainWindow
let webContents

function createWindow () {
  mainWindow = new BrowserWindow({width: 1280, height: 800, title: 'Duolingo', icon: 'duolingo'})
  webContents = mainWindow.webContents

  mainWindow.loadURL(`file://${__dirname}/index.html`)

  webContents.on('new-window', function(event, url){
    event.preventDefault();
    shell.openExternal(url);
  });

  // Disable the menu bar
  //mainWindow.setMenu(null);

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})

const template = [
  {
    label: 'App',
    submenu: [
      {
        label: 'Developer tools',
        click (item, focusedWindow) {
          mainWindow.toggleDevTools();
        }
      },
      {
        label: 'Exit',
        click (item, focusedWindow) {
          app.quit();
        }
      }
    ]
  }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
