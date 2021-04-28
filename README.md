[![Build Status](https://github.com/hmlendea/duolingo-desktop/actions/workflows/node.js.yml/badge.svg)](https://github.com/hmlendea/duolingo-desktop/actions/workflows/node.js.yml) [![Arch Linux AUR Package](https://img.shields.io/aur/version/duolingo-desktop-git?logo=arch-linux&logoColor=white)](https://aur.archlinux.org/packages/duolingo-desktop-git/)

[![Support this on Patreon](https://raw.githubusercontent.com/hmlendea/readme-assets/master/donate_patreon_small.png)](https://www.patreon.com/hmlendea)[![Support this on Patreon](https://raw.githubusercontent.com/hmlendea/readme-assets/master/donate_paypal_small.png)](https://raw.githubusercontent.com/hmlendea/readme-assets/master/donate_paypal.png)[![Donate with LiberaPay](https://raw.githubusercontent.com/hmlendea/readme-assets/master/donate_liberapay_small.png)](https://liberapay.com/HMlendea/donate)

# About

This is a cross-platform desktop client for Duolingo, that works as a wrapper around the official web app.

# Installation

## Manual

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
npm run-script build
```

[![Support on Patreon](https://raw.githubusercontent.com/hmlendea/readme-assets/master/donate_patreon.png)](https://www.patreon.com/hmlendea)[![Donate with PayPal](https://raw.githubusercontent.com/hmlendea/readme-assets/master/donate_paypal.png)](https://www.paypal.com/donate?hosted_button_id=6YVRGJHDGWGKQ)[![Donate with LiberaPay](https://raw.githubusercontent.com/hmlendea/readme-assets/master/donate_liberapay.png)](https://liberapay.com/HMlendea/donate)
