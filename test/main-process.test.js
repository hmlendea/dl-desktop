const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadMainProcess() {
    const appHandlers = new Map();
    const windows = [];
    const requestHandlers = {};
    const handlerRegistrations = { beforeRequest: 0, beforeSendHeaders: 0 };
    const lifecycle = [];
    let readyCallback;
    let quitRequested = false;

    const app = {
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
            this.webContents = {};
            this.loadURL = (url) => {
                this.loadedURL = url;
                lifecycle.push("loadURL");
            };
            windows.push(this);
        }

        static getAllWindows() {
            return windows;
        }

        setMenu() {}
    }

    const electron = {
        app,
        BrowserWindow,
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
            },
        },
    };
    const mainDirectory = path.join(__dirname, "..", "scripts");
    const source = fs.readFileSync(path.join(mainDirectory, "main.js"), "utf8");

    vm.runInNewContext(source, {
        __dirname: mainDirectory,
        process,
        URL,
        require(moduleName) {
            return moduleName === "electron" ? electron : require(moduleName);
        },
    });

    return {
        appHandlers,
        handlerRegistrations,
        lifecycle,
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
    assert.equal(path.isAbsolute(windows[0].options.webPreferences.preload), true);
    assert.equal(windows[0].loadedURL, "https://duolingo.com");
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
