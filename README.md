# PV Management Interface

[![PV Management Interface Build](https://github.com/lnls-sirius/pv-management-interface/actions/workflows/node.js.yml/badge.svg)](https://github.com/lnls-sirius/pv-management-interface/actions/workflows/node.js.yml)

## Build

`yarn install` then `yarn build`. You may also use npm.

## Currently supported actions

- Rename
- Archive
- Pause
- Resume
- Delete
- Check Status

## Features

- Supports CSV import
- Minimal size once built (<160kb)
- Lenient with whitespaces, accepts both comma-separated and newline separated PV names
