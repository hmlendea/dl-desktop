const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadMainProcess() {
    const appHandlers = new Map();
    const windows = [];
    const requestHandlers = {};
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
                    },
                    onBeforeSendHeaders(callback) {
                        requestHandlers.beforeSendHeaders = callback;
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
        require(moduleName) {
            return moduleName === "electron" ? electron : require(moduleName);
        },
    });

    return {
        appHandlers,
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

test("main process quits after all windows close outside macOS", () => {
    const { appHandlers, quitRequested } = loadMainProcess();

    appHandlers.get("window-all-closed")();

    assert.equal(quitRequested(), process.platform !== "darwin");
});
