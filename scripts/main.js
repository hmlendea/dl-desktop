const { app, BrowserWindow, session } = require("electron");
const path = require("path");
const fs = require("fs");

// Tracking and ad domains to block
const blockedDomains = [
    // Ads
    "doubleclick.net",
    "googleadservices.com",
    "googlesyndication.com",
    "adnxs.com",
    "amazon-adsystem.com",
    "advertising.com",
    "criteo.com",
    "taboola.com",
    "outbrain.com",
    // Analytics / telemetry
    "google-analytics.com",
    "googletagmanager.com",
    "googletagservices.com",
    "amplitude.com",
    "mixpanel.com",
    "segment.com",
    "segmentapis.com",
    "heapanalytics.com",
    "heap.io",
    "hotjar.com",
    "fullstory.com",
    "logrocket.com",
    "bugsnag.com",
    "sentry-cdn.com",
    // Tracking pixels
    "facebook.com/tr/",
    "connect.facebook.net",
    "ads.twitter.com",
    "analytics.tiktok.com",
    "sc-static.net",
    // Attribution
    "branch.io",
    "app.link",
    "adjust.com",
    "appsflyer.com",
    "branchmetrics.io",
];

// Tracking query parameters to strip from URLs
const trackingParams = [
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid", "gclsrc", "dclid", "msclkid",
    "mc_eid", "mc_cid",
    "_branch_match_id", "_branch_referrer",
    "ref", "referrer",
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

    // Block trackers and ads
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        const url = details.url.toLowerCase();
        if (blockedDomains.some((domain) => url.includes(domain))) {
            callback({ cancel: true });
            return;
        }

        // Strip tracking query parameters
        try {
            const parsed = new URL(details.url);
            let stripped = false;
            for (const param of trackingParams) {
                if (parsed.searchParams.has(param)) {
                    parsed.searchParams.delete(param);
                    stripped = true;
                }
            }
            if (stripped) {
                callback({ redirectURL: parsed.toString() });
                return;
            }
        } catch (_) {}

        callback({ cancel: false });
    });

    // Send Do-Not-Track and Global Privacy Control headers
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders["DNT"] = "1";
        details.requestHeaders["Sec-GPC"] = "1";
        callback({ requestHeaders: details.requestHeaders });
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
