#!/usr/bin/env bash
set -euo pipefail

readonly APP_ID='ro.go.hmlendea.DL-Desktop'
readonly EXECUTABLE_NAME='dl-desktop'
readonly SOURCE_DIRECTORY="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

if [[ -z "${HOME:-}" ]]; then
    printf '%s\n' 'HOME must be set to install the application.' >&2
    exit 1
fi

readonly DATA_DIRECTORY="${XDG_DATA_HOME:-${HOME}/.local/share}"
readonly INSTALL_DIRECTORY="${DATA_DIRECTORY}/dl-desktop"
readonly APPLICATIONS_DIRECTORY="${DATA_DIRECTORY}/applications"
readonly ICON_DIRECTORY="${DATA_DIRECTORY}/icons/hicolor/512x512/apps"
readonly DESKTOP_FILE="${APPLICATIONS_DIRECTORY}/${APP_ID}.desktop"
readonly ICON_FILE="${ICON_DIRECTORY}/${APP_ID}.png"

if [[ ! -x "${SOURCE_DIRECTORY}/${EXECUTABLE_NAME}" ||
    ! -f "${SOURCE_DIRECTORY}/resources/icon.png" ||
    ! -f "${SOURCE_DIRECTORY}/${APP_ID}.desktop" ]]; then
    printf '%s\n' 'Run this installer from a complete extracted Linux application archive.' >&2
    exit 1
fi

mkdir -p "${INSTALL_DIRECTORY}" "${APPLICATIONS_DIRECTORY}" "${ICON_DIRECTORY}"
if [[ "${SOURCE_DIRECTORY}" != "${INSTALL_DIRECTORY}" ]]; then
    cp -a "${SOURCE_DIRECTORY}/." "${INSTALL_DIRECTORY}/"
fi
cp "${SOURCE_DIRECTORY}/resources/icon.png" "${ICON_FILE}"

EXECUTABLE_PATH="${INSTALL_DIRECTORY}/${EXECUTABLE_NAME}"
EXECUTABLE_PATH="${EXECUTABLE_PATH//\\/\\\\}"
EXECUTABLE_PATH="${EXECUTABLE_PATH//\"/\\\"}"
EXECUTABLE_PATH="${EXECUTABLE_PATH//\`/\\\`}"
EXECUTABLE_PATH="${EXECUTABLE_PATH//\$/\\\$}"
EXECUTABLE_PATH="${EXECUTABLE_PATH//%/%%}"

while IFS= read -r LINE || [[ -n "${LINE}" ]]; do
    case "${LINE}" in
        Exec=*) printf 'Exec="%s"\n' "${EXECUTABLE_PATH}" ;;
        *) printf '%s\n' "${LINE}" ;;
    esac
done < "${SOURCE_DIRECTORY}/${APP_ID}.desktop" > "${DESKTOP_FILE}"

printf '%s\n' 'Installed DL: language lessons. Launch it from your desktop menu.'