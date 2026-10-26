const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadMainProcess(permissionPromptResponse = 0, isPackaged = false) {
    const appHandlers = new Map();
    const windows = [];
    const requestHandlers = {};
    const handlerRegistrations = { beforeRequest: 0, beforeSendHeaders: 0 };
    const permissionHandlers = {};
    const permissionPrompts = [];
    const lifecycle = [];
    const loadUrlResults = [];
    const loadedUrls = [];
    let readyCallback;
    let quitRequested = false;

    const app = {
        isPackaged,
        whenReady() {
            return {
                then(callback) {
                    readyCallback = callback;
                },
            };
        },
        on(eventName, callback) {
            appHandlers.set(eventName, callback);
        },
        quit() {
            quitRequested = true;
        },
    };

    class BrowserWindow {
        constructor(options) {
            this.options = options;
            this.webContents = {
                userAgent: "Electron default user agent",
                handlers: new Map(),
                getURL() {
                    return this.window.loadedURL ?? "";
                },
                on(eventName, callback) {
                    this.handlers.set(eventName, callback);
                },
                setWindowOpenHandler(callback) {
                    this.windowOpenHandler = callback;
                },
            };
            this.webContents.window = this;
            this.loadURL = (url) => {
                this.loadedURL = url;
                loadedUrls.push(url);
                lifecycle.push("loadURL");
                return loadUrlResults.shift() ?? Promise.resolve();
            };
            this.isDestroyed = () => false;
            windows.push(this);
        }

        static getAllWindows() {
            return windows;
        }

        static fromWebContents(webContents) {
            return webContents.window;
        }

        setMenu() {}
    }

    const electron = {
        app,
        BrowserWindow,
        dialog: {
            showMessageBox(...argumentsList) {
                permissionPrompts.push(argumentsList);
                return Promise.resolve({ response: permissionPromptResponse });
            },
        },
        session: {
            defaultSession: {
                webRequest: {
                    onBeforeRequest(callback) {
                        requestHandlers.beforeRequest = callback;
                        handlerRegistrations.beforeRequest += 1;
                        lifecycle.push("beforeRequest");
                    },
                    onBeforeSendHeaders(callback) {
                        requestHandlers.beforeSendHeaders = callback;
                        handlerRegistrations.beforeSendHeaders += 1;
                        lifecycle.push("beforeSendHeaders");
                    },
                },
                setPermissionCheckHandler(callback) {
                    permissionHandlers.check = callback;
                    lifecycle.push("permissionCheck");
                },
                setPermissionRequestHandler(callback) {
                    permissionHandlers.request = callback;
                    lifecycle.push("permissionRequest");
                },
            },
        },
    };
    const mainDirectory = path.join(__dirname, "..", "scripts");
    const source = fs.readFileSync(path.join(mainDirectory, "main.js"), "utf8");
    const mainProcess = Object.assign(Object.create(process), {
        resourcesPath: "/packaged/resources",
    });

    vm.runInNewContext(source, {
        __dirname: mainDirectory,
        process: mainProcess,
        URL,
        require(moduleName) {
            return moduleName === "electron" ? electron : require(moduleName);
        },
    });

    return {
        appHandlers,
        handlerRegistrations,
        lifecycle,
        loadUrlResults,
        loadedUrls,
        permissionHandlers,
        permissionPrompts,
        readyCallback: () => readyCallback(),
        requestHandlers,
        quitRequested: () => quitRequested,
        windows,
    };
}

test("main process creates its window after readiness with isolated content", () => {
    const { readyCallback, windows } = loadMainProcess();

    assert.equal(windows.length, 0);
    readyCallback();

    assert.equal(windows.length, 1);
    assert.equal(windows[0].options.webPreferences.contextIsolation, true);
    assert.equal(windows[0].options.webPreferences.webviewTag, false);
    assert.equal(windows[0].webContents.userAgent, "Electron default user agent");
    assert.equal(path.isAbsolute(windows[0].options.webPreferences.preload), true);
    assert.equal(windows[0].options.icon, path.join(__dirname, "..", "icon.png"));
    assert.equal(windows[0].loadedURL, "https://duolingo.com");
});

test("main process resolves its packaged window icon from Electron resources", () => {
    const { readyCallback, windows } = loadMainProcess(0, true);
    readyCallback();

    assert.equal(windows[0].options.icon, "/packaged/resources/icon.png");
});

test("build configuration includes the window icon as an application resource", () => {
    const packageConfiguration = JSON.parse(
        fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
    );

    assert.ok(packageConfiguration.build.extraResources.includes("icon.png"));
    assert.ok(packageConfiguration.build.extraFiles.includes("ro.go.hmlendea.DL-Desktop.desktop"));
    assert.ok(packageConfiguration.build.extraFiles.includes("install-linux.sh"));
});

test("Linux installer registers the app and icon for a user path containing spaces", () => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "dl-desktop install "));
    const sourceDirectory = path.join(temporaryDirectory, "release archive");
    const dataDirectory = path.join(temporaryDirectory, "user data 100% $");

    try {
        fs.mkdirSync(path.join(sourceDirectory, "resources"), { recursive: true });
        fs.copyFileSync(path.join(__dirname, "..", "install-linux.sh"), path.join(sourceDirectory, "install-linux.sh"));
        fs.copyFileSync(
            path.join(__dirname, "..", "ro.go.hmlendea.DL-Desktop.desktop"),
            path.join(sourceDirectory, "ro.go.hmlendea.DL-Desktop.desktop")
        );
        fs.copyFileSync(path.join(__dirname, "..", "icon.png"), path.join(sourceDirectory, "resources", "icon.png"));
        fs.writeFileSync(path.join(sourceDirectory, "dl-desktop"), "binary");
        fs.chmodSync(path.join(sourceDirectory, "dl-desktop"), 0o755);

        execFileSync("bash", [path.join(sourceDirectory, "install-linux.sh")], {
            env: { ...process.env, HOME: path.join(temporaryDirectory, "user home"), XDG_DATA_HOME: dataDirectory },
        });

        const installedExecutable = path.join(dataDirectory, "dl-desktop", "dl-desktop");
        const desktopFile = path.join(
            dataDirectory,
            "applications",
            "ro.go.hmlendea.DL-Desktop.desktop"
        );
        const installedIcon = path.join(
            dataDirectory,
            "icons",
            "hicolor",
            "512x512",
            "apps",
            "ro.go.hmlendea.DL-Desktop.png"
        );
        const expectedDesktopExecutable = installedExecutable
            .replace(/\\/g, "\\\\")
            .replace(/"/g, "\\\"")
            .replace(/`/g, "\\`")
            .replace(/\$/g, "\\$")
            .replace(/%/g, "%%");

        assert.equal(fs.readFileSync(installedExecutable, "utf8"), "binary");
        assert.ok(
            fs.readFileSync(desktopFile, "utf8").split("\n").includes(`Exec="${expectedDesktopExecutable}"`)
        );
        assert.deepEqual(fs.readFileSync(installedIcon), fs.readFileSync(path.join(__dirname, "..", "icon.png")));
    } finally {
        fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
});

test("main process presents a retry page only for main-frame load failures", () => {
    const { readyCallback, loadedUrls, windows } = loadMainProcess();
    readyCallback();

    const webContents = windows[0].webContents;
    const failedLoadHandler = webContents.handlers.get("did-fail-load");
    failedLoadHandler({}, -105, "ERR_NAME_NOT_RESOLVED", "https://private.example/path", false);
    failedLoadHandler({}, -3, "ERR_ABORTED", "https://duolingo.com/learn", true);
    assert.equal(loadedUrls.length, 1);

    failedLoadHandler({}, -105, "ERR_NAME_NOT_RESOLVED", "https://private.example/path", true);
    assert.equal(loadedUrls.length, 2);
    assert.equal(windows.length, 1);

    const errorPage = decodeURIComponent(loadedUrls[1]);
    assert.match(errorPage, /Check your internet connection, then try again\./);
    assert.match(errorPage, /href="https:\/\/duolingo\.com"/);
    assert.doesNotMatch(errorPage, /private\.example/);

    let navigationPrevented = false;
    webContents.handlers.get("will-navigate")(
        { preventDefault() { navigationPrevented = true; } },
        "https://duolingo.com"
    );
    assert.equal(navigationPrevented, false);
});

test("main process recovers from a rejected initial load", async () => {
    const { loadUrlResults, loadedUrls, readyCallback, windows } = loadMainProcess();
    loadUrlResults.push(Promise.reject(new Error("network unavailable")));
    readyCallback();
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(loadedUrls.length, 2);
    assert.match(decodeURIComponent(loadedUrls[1]), /Unable to load DL Desktop/);
    assert.equal(windows.length, 1);
});

test("main process presents one retry page after renderer termination", () => {
    const { loadedUrls, readyCallback, windows } = loadMainProcess();
    readyCallback();

    windows[0].webContents.handlers.get("render-process-gone")();
    assert.equal(loadedUrls.length, 2);
    assert.match(decodeURIComponent(loadedUrls[1]), /Unable to load DL Desktop/);

    windows[0].webContents.handlers.get("render-process-gone")();
    assert.equal(loadedUrls.length, 2);
    assert.equal(windows.length, 1);
});

test("main process allows only approved HTTPS navigation origins", () => {
    const { readyCallback, windows } = loadMainProcess();
    readyCallback();

    const navigationHandler = windows[0].webContents.handlers.get("will-navigate");
    const navigationCases = [
        { url: "https://duolingo.com/learn", blocked: false },
        { url: "https://www.duolingo.com/learn", blocked: false },
        { url: "https://auth.duolingo.com/login", blocked: false },
        { url: "https://duolingo.com.evil.example/learn", blocked: true },
        { url: "https://evil-duolingo.com/learn", blocked: true },
        { url: "http://duolingo.com/learn", blocked: true },
        { url: "javascript:alert(1)", blocked: true },
        { url: "file:///etc/passwd", blocked: true },
        { url: "not a URL", blocked: true },
    ];

    for (const navigationCase of navigationCases) {
        let prevented = false;
        navigationHandler({ preventDefault() { prevented = true; } }, navigationCase.url);
        assert.equal(prevented, navigationCase.blocked, navigationCase.url);
    }
});

test("main process blocks unapproved redirects and denies new windows", () => {
    const { readyCallback, windows } = loadMainProcess();
    readyCallback();

    const webContents = windows[0].webContents;
    const redirectHandler = webContents.handlers.get("will-redirect");
    const redirectCases = [
        { url: "https://www.duolingo.com/learn", blocked: false },
        { url: "https://auth.duolingo.com/login", blocked: false },
        { url: "https://duolingo.com.evil.example/learn", blocked: true },
        { url: "https://accounts.example/login", blocked: true },
        { url: "javascript:alert(1)", blocked: true },
        { url: "file:///etc/passwd", blocked: true },
    ];

    for (const redirectCase of redirectCases) {
        let prevented = false;
        redirectHandler({ preventDefault() { prevented = true; } }, redirectCase.url);
        assert.equal(prevented, redirectCase.blocked, redirectCase.url);
    }

    assert.equal(webContents.windowOpenHandler({ url: "https://example.com" }).action, "deny");
});

test("main process prompts before granting microphone access to an approved main frame", async () => {
    const { lifecycle, permissionHandlers, permissionPrompts, readyCallback, windows } = loadMainProcess();
    readyCallback();

    assert.ok(lifecycle.indexOf("permissionCheck") < lifecycle.indexOf("loadURL"));
    assert.ok(lifecycle.indexOf("permissionRequest") < lifecycle.indexOf("loadURL"));

    const webContents = windows[0].webContents;
    let permissionGranted;
    await permissionHandlers.request(
        webContents,
        "media",
        (granted) => {
            permissionGranted = granted;
        },
        {
            isMainFrame: true,
            mediaTypes: ["audio"],
            requestingUrl: "https://duolingo.com/learn/speaking",
            securityOrigin: "https://duolingo.com",
        }
    );

    assert.equal(permissionGranted, true);
    assert.equal(permissionPrompts.length, 1);
    assert.equal(permissionPrompts[0][0], windows[0]);
    assert.deepEqual(Array.from(permissionPrompts[0][1].buttons), ["Allow", "Deny"]);
    assert.equal(
        permissionHandlers.check(webContents, "media", "https://duolingo.com", {
            isMainFrame: true,
            mediaType: "audio",
            requestingUrl: "https://duolingo.com/learn/speaking",
            securityOrigin: "https://duolingo.com",
        }),
        true
    );

    let repeatedPermissionGranted;
    await permissionHandlers.request(
        webContents,
        "media",
        (granted) => {
            repeatedPermissionGranted = granted;
        },
        {
            isMainFrame: true,
            mediaTypes: ["audio"],
            requestingUrl: "https://duolingo.com/learn/speaking",
            securityOrigin: "https://duolingo.com",
        }
    );
    assert.equal(repeatedPermissionGranted, true);
    assert.equal(permissionPrompts.length, 1);
});

test("main process denies microphone requests unless they are audio-only, trusted, and top-level", async () => {
    const { permissionHandlers, permissionPrompts, readyCallback, windows } = loadMainProcess(1);
    readyCallback();

    const webContents = windows[0].webContents;
    const requestCases = [
        { permission: "notifications", mediaTypes: ["audio"], isMainFrame: true, url: "https://duolingo.com/learn" },
        { permission: "media", mediaTypes: ["video"], isMainFrame: true, url: "https://duolingo.com/learn" },
        { permission: "media", mediaTypes: ["audio", "video"], isMainFrame: true, url: "https://duolingo.com/learn" },
        { permission: "media", mediaTypes: ["audio"], isMainFrame: false, url: "https://duolingo.com/learn" },
        { permission: "media", mediaTypes: ["audio"], isMainFrame: true, url: "https://duolingo.com.evil.example/learn" },
        { permission: "media", mediaTypes: ["audio"], isMainFrame: true, url: "https://auth.duolingo.com/learn" },
    ];

    for (const requestCase of requestCases) {
        let permissionGranted;
        await permissionHandlers.request(
            webContents,
            requestCase.permission,
            (granted) => {
                permissionGranted = granted;
            },
            {
                isMainFrame: requestCase.isMainFrame,
                mediaTypes: requestCase.mediaTypes,
                requestingUrl: requestCase.url,
                securityOrigin: new URL(requestCase.url).origin,
            }
        );
        assert.equal(permissionGranted, false, requestCase.url);
    }

    assert.equal(permissionPrompts.length, 0);
    assert.equal(
        permissionHandlers.check(webContents, "media", "https://duolingo.com", {
            isMainFrame: true,
            mediaType: "audio",
            requestingUrl: "https://duolingo.com/learn",
            securityOrigin: "https://duolingo.com",
        }),
        false
    );
    assert.equal(
        permissionHandlers.check(webContents, "notifications", "https://duolingo.com", {
            isMainFrame: true,
            mediaType: "audio",
            securityOrigin: "https://duolingo.com",
        }),
        false
    );
    assert.equal(
        permissionHandlers.check(webContents, "media", "https://duolingo.com", {
            isMainFrame: false,
            mediaType: "audio",
            securityOrigin: "https://duolingo.com",
        }),
        false
    );
    assert.equal(
        permissionHandlers.check(webContents, "media", "https://duolingo.com", {
            isMainFrame: true,
            mediaType: "video",
            securityOrigin: "https://duolingo.com",
        }),
        false
    );
    assert.equal(
        permissionHandlers.check(webContents, "media", "https://duolingo.com", {
            isMainFrame: true,
            mediaType: "audio",
            requestingUrl: "not a URL",
            securityOrigin: "https://duolingo.com",
        }),
        false
    );
});

test("main process denies microphone access when the user rejects the prompt or origins disagree", async () => {
    const { permissionHandlers, permissionPrompts, readyCallback, windows } = loadMainProcess(1);
    readyCallback();

    const webContents = windows[0].webContents;
    let permissionGranted;
    await permissionHandlers.request(
        webContents,
        "media",
        (granted) => {
            permissionGranted = granted;
        },
        {
            isMainFrame: true,
            mediaTypes: ["audio"],
            requestingUrl: "https://duolingo.com/learn/speaking",
            securityOrigin: "https://www.duolingo.com",
        }
    );
    assert.equal(permissionGranted, false);
    assert.equal(permissionPrompts.length, 0);

    await permissionHandlers.request(
        webContents,
        "media",
        (granted) => {
            permissionGranted = granted;
        },
        {
            isMainFrame: true,
            mediaTypes: ["audio"],
            requestingUrl: "https://duolingo.com/learn/speaking",
            securityOrigin: "https://duolingo.com",
        }
    );
    assert.equal(permissionGranted, false);
    assert.equal(permissionPrompts.length, 1);
    assert.equal(
        permissionHandlers.check(webContents, "media", "https://duolingo.com", {
            isMainFrame: true,
            mediaType: "audio",
            securityOrigin: "https://duolingo.com",
        }),
        false
    );
});

test("main process installs request filters and privacy headers", () => {
    const { readyCallback, requestHandlers } = loadMainProcess();
    readyCallback();

    let requestResult;
    requestHandlers.beforeRequest(
        { url: "https://duolingo.com/learn" },
        (result) => {
            requestResult = result;
        }
    );
    assert.equal(requestResult.cancel, false);

    let headerResult;
    requestHandlers.beforeSendHeaders(
        { requestHeaders: {} },
        (result) => {
            headerResult = result;
        }
    );
    assert.equal(headerResult.requestHeaders.DNT, "1");
    assert.equal(headerResult.requestHeaders["Sec-GPC"], "1");
});

test("main process installs privacy hooks before navigation and reuses them for recreated windows", () => {
    const { appHandlers, handlerRegistrations, lifecycle, readyCallback, requestHandlers, windows } =
        loadMainProcess();

    readyCallback();

    assert.ok(lifecycle.indexOf("beforeRequest") < lifecycle.indexOf("loadURL"));
    assert.ok(lifecycle.indexOf("beforeSendHeaders") < lifecycle.indexOf("loadURL"));
    assert.deepEqual(handlerRegistrations, { beforeRequest: 1, beforeSendHeaders: 1 });

    const assertPrivacyPolicy = () => {
        let requestResult;
        requestHandlers.beforeRequest({ url: "https://google-analytics.com/collect" }, (result) => {
            requestResult = result;
        });
        assert.equal(requestResult.cancel, true);

        let headerResult;
        requestHandlers.beforeSendHeaders({ requestHeaders: {} }, (result) => {
            headerResult = result;
        });
        assert.equal(headerResult.requestHeaders.DNT, "1");
        assert.equal(headerResult.requestHeaders["Sec-GPC"], "1");
    };

    assertPrivacyPolicy();
    windows.length = 0;
    appHandlers.get("activate")();

    assert.equal(windows.length, 1);
    assert.deepEqual(handlerRegistrations, { beforeRequest: 1, beforeSendHeaders: 1 });
    assertPrivacyPolicy();
});

test("main process blocks tracker hosts and Facebook tracking paths structurally", () => {
    const { readyCallback, requestHandlers } = loadMainProcess();
    readyCallback();

    const requestCases = [
        { url: "https://google-analytics.com/collect", blocked: true },
        { url: "https://www.google-analytics.com/collect", blocked: true },
        { url: "https://notgoogle-analytics.com/lesson", blocked: false },
        {
            url: "https://www.duolingo.com/learn?next=google-analytics.com",
            blocked: false,
        },
        { url: "https://facebook.com/tr/?id=123", blocked: true },
        { url: "https://www.facebook.com/tr/?id=123", blocked: true },
        { url: "https://facebook.com/profile", blocked: false },
        { url: "https://facebook.com/training", blocked: false },
    ];

    for (const requestCase of requestCases) {
        let requestResult;
        requestHandlers.beforeRequest({ url: requestCase.url }, (result) => {
            requestResult = result;
        });

        assert.equal(
            requestResult.cancel,
            requestCase.blocked,
            `Unexpected tracker decision for ${requestCase.url}`
        );
    }
});

test("main process strips only tracking parameters from safe HTTP requests", () => {
    const { readyCallback, requestHandlers } = loadMainProcess();
    readyCallback();

    const requestCases = [
        {
            method: "GET",
            url: "https://duolingo.com/learn?utm_source=mail&utm_source=app&next=lesson#exercise",
            redirectURL: "https://duolingo.com/learn?next=lesson#exercise",
        },
        {
            method: "HEAD",
            url: "https://duolingo.com/learn?gclid=123",
            redirectURL: "https://duolingo.com/learn",
        },
        {
            method: "GET",
            url: "https://duolingo.com/learn?ref=lesson&referrer=course",
        },
        { method: "GET", url: "https://duolingo.com/learn?next=lesson" },
        {
            method: "POST",
            url: "https://duolingo.com/submit?utm_source=mail",
        },
        {
            method: "PUT",
            url: "https://duolingo.com/profile?fbclid=123",
        },
        {
            method: "GET",
            url: "duolingo://learn?utm_source=mail",
        },
    ];

    for (const requestCase of requestCases) {
        let requestResult;
        requestHandlers.beforeRequest(requestCase, (result) => {
            requestResult = result;
        });

        if (requestCase.redirectURL) {
            assert.equal(requestResult.redirectURL, requestCase.redirectURL);

            let repeatedResult;
            requestHandlers.beforeRequest(
                { method: requestCase.method, url: requestResult.redirectURL },
                (result) => {
                    repeatedResult = result;
                }
            );
            assert.equal(repeatedResult.cancel, false);
            assert.equal(repeatedResult.redirectURL, undefined);
        } else {
            assert.equal(requestResult.cancel, false);
            assert.equal(requestResult.redirectURL, undefined);
        }
    }
});

test("main process quits after all windows close outside macOS", () => {
    const { appHandlers, quitRequested } = loadMainProcess();

    appHandlers.get("window-all-closed")();

    assert.equal(quitRequested(), process.platform !== "darwin");
});
