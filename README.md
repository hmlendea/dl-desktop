[![Donate](https://img.shields.io/badge/-%E2%99%A5%20Donate-%23ff69b4)](https://hmlendea.go.ro/fund.html) [![Build Status](https://github.com/hmlendea/dl-desktop/actions/workflows/node.js.yml/badge.svg)](https://github.com/hmlendea/dl-desktop/actions/workflows/node.js.yml) [![Latest GitHub release](https://img.shields.io/github/v/release/hmlendea/dl-desktop)](https://github.com/hmlendea/dl-desktop/releases/latest)

# About

This is an **unofficial** Linux desktop client for Duolingo, which works as a wrapper around the official web app.

# Installation

[![Get it from the AUR](https://raw.githubusercontent.com/hmlendea/readme-assets/master/install_from_aur.png)](https://aur.archlinux.org/packages/duolingo-desktop-bin/) [![Get it from FlatHub](https://raw.githubusercontent.com/hmlendea/readme-assets/master/badges/stores/flathub.png)](https://flathub.org/apps/details/ro.go.hmlendea.DL-Desktop) [![Get it from the Snap Store](https://raw.githubusercontent.com/snapcore/snap-store-badges/master/EN/%5BEN%5D-snap-store-white.png)](https://snapcraft.io/duolingo-desktop)

**Note**: _Only the FlatHub version is officially supported by this repository. The AUR and Snap versions are community-maintained. Please report any issues with these versions on their respective pages._

## Using a package manager

On Arch Linux, the package is available on the AUR: [duolingo-desktop-bin](https://aur.archlinux.org/packages/duolingo-desktop-bin/).  
Please note that the package `duolingo-desktop-git` has not been updated since 2020. Therefore, we recommend using `duolingo-desktop-bin` for installing Duolingo on Arch.

For other distributions, please check if this package is available in your package manager's repository.

# Usage

If you've installed it through your package manager, it should automatically add a launcher for the app. Otherwise, you can run the `dl-desktop` binary manually.

# Building from source (Linux)

You will need to install [npm](https://www.npmjs.com/), the Node.js package manager.

In the main directory of this repository, run the following commands:

```bash
npm install
npm run build
```

# Building from source (Windows)

You will need to install [Node.js](https://nodejs.org/en/download/current/), which includes npm.

Then, depending on your system, run the following commands in the main directory:

For Windows:
```powershell
npm install
./node_modules/.bin/electron-builder --win
```

For Linux (to build for Windows):
```bash
npm install
sudo ./node_modules/.bin/electron-builder --win
```

# Credits
- Duolingo, for providing an awesome language learning platform.
- [creepertron95](https://github.com/creepertron95) for the [icon](https://github.com/PapirusDevelopmentTeam/papirus-icon-theme/blob/6e4fea69f884e2e874e872b87e49892a246be65d/Papirus/48x48/apps/duolingo.svg).
- All our [contributors](https://github.com/hmlendea/dl-desktop/graphs/contributors)!

_The name Duolingo and the Duolingo logo are copyrights of Duolingo._
