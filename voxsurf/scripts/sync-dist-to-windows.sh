#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"

# Allow overrides from local env files too.
for ENV_FILE in "${ROOT_DIR}/.env.local" "${ROOT_DIR}/.env"; do
  if [[ -f "${ENV_FILE}" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "${ENV_FILE}"
    set +a
  fi
done

if [[ ! -d "${DIST_DIR}" ]]; then
  echo "[voxsurf] dist folder not found, skipping Windows sync."
  exit 0
fi

if [[ -n "${VOXSURF_WINDOWS_DIST_DIR:-}" ]]; then
  TARGET_DIR="${VOXSURF_WINDOWS_DIST_DIR}"
else
  if [[ ! -d /mnt/c/Users ]]; then
    echo "[voxsurf] /mnt/c/Users not found. Set VOXSURF_WINDOWS_DIST_DIR to enable sync."
    exit 0
  fi

  WIN_USER="$(find /mnt/c/Users -mindepth 1 -maxdepth 1 -type d \
    ! -name "All Users" \
    ! -name "Default" \
    ! -name "Default User" \
    ! -name "Public" \
    ! -name "WsiAccount" \
    -printf '%f\n' | head -n 1)"

  if [[ -z "${WIN_USER}" ]]; then
    echo "[voxsurf] Could not detect a Windows user. Set VOXSURF_WINDOWS_DIST_DIR to enable sync."
    exit 0
  fi

  TARGET_DIR="/mnt/c/Users/${WIN_USER}/Desktop/voxsurf-dist"
fi

mkdir -p "${TARGET_DIR}"
rsync -a --delete "${DIST_DIR}/" "${TARGET_DIR}/"

echo "[voxsurf] Synced dist -> ${TARGET_DIR}"
