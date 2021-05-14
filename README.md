[![Donate](https://img.shields.io/badge/-%E2%99%A5%20Donate-%23ff69b4)](https://hmlendea.go.ro/fund.html) [![Latest GitHub release](https://img.shields.io/github/v/release/hmlendea/duolingo-desktop)](https://github.com/hmlendea/duolingo-desktop/releases/latest) [![Build Status](https://github.com/hmlendea/duolingo-desktop/actions/workflows/node.js.yml/badge.svg)](https://github.com/hmlendea/duolingo-desktop/actions/workflows/node.js.yml)

# About

This is a cross-platform desktop client for Duolingo, that works as a wrapper around the official web app.

# Installation

[![Get it from the AUR](https://raw.githubusercontent.com/hmlendea/readme-assets/master/install_from_aur.png)](https://aur.archlinux.org/packages/duolingo-desktop-git/)

## Manual Installation

 - Go to the [latest release](https://github.com/hmlendea/duolingo-desktop/releases/latest).
 - Download the specific file that best fits your disto:
   - **apk**: Installation package for Alpine Linux.
   - **deb**: Installation package for Debian and Ubuntu, and of course all their derivates.
   - **snap**: Snap package installer, for distributions like e.g. Ubuntu.
   - **zip**: A simple zip archive containing a generic Linux build for all distros that can run without installation.
   - **AppImage**: A single big binary file holding the entire app that can run without installation.

## Using a package manager

On Arch Linux, the package is available on the AUR ([duolingo-desktop-git](https://aur.archlinux.org/packages/duolingo-desktop-git/)).

For other distributions, you will have to check if someone included this package into the package manager's repository.

# Usage

If you've installed it through your package manager, then it should already contain a launcher for it. Otherwise, run the `duolingo-desktop` binary.

# Building from source

You will need to install [npm](https://www.npmjs.com/), the Node.js package manager.

In the main directory of this repository run the following:
```
npm install
npm run build
```
