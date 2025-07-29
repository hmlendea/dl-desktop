const { app, BrowserWindow, session } = require("electron");
const path = require("path");
const fs = require("fs");

// Common ad domains to block
const adDomains = [
    "doubleclick.net",
    "google-analytics.com",
    "googleadservices.com",
    "googlesyndication.com",
    "adnxs.com",
    "amazon-adsystem.com",
    "facebook.com/tr/",
    "advertising.com",
];

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        icon: path.join("icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: false,
            webviewTag: true,
        },
    });

    mainWindow.webContents.userAgent =
        "Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0";
    mainWindow.loadURL("https://duolingo.com");

    // Set up ad blocking
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        const url = details.url.toLowerCase();
        if (adDomains.some((domain) => url.includes(domain))) {
            callback({ cancel: true });
        } else {
            callback({ cancel: false });
        }
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("browser-window-created", function (e, window) {
    window.setMenu(null);
});

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
