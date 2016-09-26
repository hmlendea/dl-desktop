const electron = require('electron');

let impl = null;

switch (process.type) {
  case 'browser':
    impl = electron.app;
    break;

  case 'renderer':
    impl = electron.remote.app;
    break;
}

module.exports = impl;
