const { app, BrowserWindow, dialog, session } = require("electron");
const path = require("path");
const fs = require("fs");
const allowedNavigationOrigins = new Set([
    "https://duolingo.com",
    "https://www.duolingo.com",
    "https://auth.duolingo.com",
]);
const microphoneConsents = new WeakMap();

// Tracking and ad domains to block
const blockedHosts = [
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

const blockedPaths = [
    { host: "facebook.com", pathnamePrefix: "/tr/" },
];

// Tracking query parameters to strip from URLs
const trackingParams = [
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid", "gclsrc", "dclid", "msclkid",
    "mc_eid", "mc_cid",
    "_branch_match_id", "_branch_referrer",
];
const safeRedirectMethods = new Set(["GET", "HEAD"]);
const redirectableProtocols = new Set(["http:", "https:"]);

function installPrivacyHooks() {
    // Block trackers and ads
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        let parsedUrl;
        try {
            parsedUrl = new URL(details.url);
        } catch {
            callback({ cancel: false });
            return;
        }

        const hostname = parsedUrl.hostname.toLowerCase();
        const isBlockedHost = blockedHosts.some(
            (host) => hostname === host || hostname.endsWith(`.${host}`)
        );
        const isBlockedPath = blockedPaths.some(
            (rule) =>
                (hostname === rule.host || hostname.endsWith(`.${rule.host}`)) &&
                parsedUrl.pathname.startsWith(rule.pathnamePrefix)
        );
        if (isBlockedHost || isBlockedPath) {
            callback({ cancel: true });
            return;
        }

        if (
            !safeRedirectMethods.has(details.method) ||
            !redirectableProtocols.has(parsedUrl.protocol)
        ) {
            callback({ cancel: false });
            return;
        }

        // Strip tracking query parameters
        let stripped = false;
        for (const param of trackingParams) {
            if (parsedUrl.searchParams.has(param)) {
                parsedUrl.searchParams.delete(param);
                stripped = true;
            }
        }
        if (stripped) {
            callback({ redirectURL: parsedUrl.toString() });
            return;
        }

        callback({ cancel: false });
    });

    // Send Do-Not-Track and Global Privacy Control headers
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders["DNT"] = "1";
        details.requestHeaders["Sec-GPC"] = "1";
        callback({ requestHeaders: details.requestHeaders });
    });
}

function getAllowedPermissionOrigin(webContents, requestingUrl, securityOrigin, isMainFrame) {
    if (!webContents || !isMainFrame) {
        return null;
    }

    try {
        const requestingOrigin = new URL(requestingUrl).origin;
        const currentOrigin = new URL(webContents.getURL()).origin;
        if (
            !allowedNavigationOrigins.has(requestingOrigin) ||
            requestingOrigin !== currentOrigin ||
            (securityOrigin && new URL(securityOrigin).origin !== requestingOrigin)
        ) {
            return null;
        }

        return requestingOrigin;
    } catch {
        return null;
    }
}

function hasMicrophoneConsent(webContents, origin) {
    return microphoneConsents.get(webContents)?.has(origin) === true;
}

function rememberMicrophoneConsent(webContents, origin) {
    let consentedOrigins = microphoneConsents.get(webContents);
    if (!consentedOrigins) {
        consentedOrigins = new Set();
        microphoneConsents.set(webContents, consentedOrigins);
    }

    consentedOrigins.add(origin);
}

function installPermissionHandlers() {
    const defaultSession = session.defaultSession;

    defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
        if (permission !== "media" || details.mediaType !== "audio") {
            return false;
        }

        const origin = getAllowedPermissionOrigin(
            webContents,
            requestingOrigin,
            details.securityOrigin,
            details.isMainFrame
        );
        if (!origin) {
            return false;
        }

        if (
            details.requestingUrl &&
            getAllowedPermissionOrigin(
                webContents,
                details.requestingUrl,
                details.securityOrigin,
                details.isMainFrame
            ) !== origin
        ) {
            return false;
        }

        return hasMicrophoneConsent(webContents, origin);
    });

    defaultSession.setPermissionRequestHandler(async (webContents, permission, callback, details) => {
        const isAudioOnlyRequest =
            permission === "media" &&
            Array.isArray(details.mediaTypes) &&
            details.mediaTypes.length === 1 &&
            details.mediaTypes[0] === "audio";
        const origin = getAllowedPermissionOrigin(
            webContents,
            details.requestingUrl,
            details.securityOrigin,
            details.isMainFrame
        );
        if (!isAudioOnlyRequest || !origin) {
            callback(false);
            return;
        }

        if (hasMicrophoneConsent(webContents, origin)) {
            callback(true);
            return;
        }

        try {
            const messageBoxOptions = {
                type: "question",
                title: "Microphone access",
                message: `Allow ${origin} to use the microphone for speaking exercises?`,
                buttons: ["Allow", "Deny"],
                defaultId: 1,
                cancelId: 1,
            };
            const parentWindow = BrowserWindow.fromWebContents(webContents);
            const result = parentWindow
                ? await dialog.showMessageBox(parentWindow, messageBoxOptions)
                : await dialog.showMessageBox(messageBoxOptions);
            const isGranted = result.response === 0;
            if (isGranted) {
                rememberMicrophoneConsent(webContents, origin);
            }

            callback(isGranted);
        } catch {
            callback(false);
        }
    });
}

function isAllowedNavigation(url) {
    try {
        const parsedUrl = new URL(url);
        return allowedNavigationOrigins.has(parsedUrl.origin);
    } catch {
        return false;
    }
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        icon: path.join("icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            webviewTag: false,
        },
    });

    mainWindow.webContents.on("will-navigate", (event, url) => {
        if (!isAllowedNavigation(url)) {
            event.preventDefault();
        }
    });
    mainWindow.webContents.on("will-redirect", (event, url) => {
        if (!isAllowedNavigation(url)) {
            event.preventDefault();
        }
    });
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

    mainWindow.webContents.userAgent =
        "Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0";
    mainWindow.loadURL("https://duolingo.com");
}

app.whenReady().then(() => {
    installPrivacyHooks();
    installPermissionHandlers();
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
