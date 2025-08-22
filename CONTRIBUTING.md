# Contributing

## Getting Started

### 1. Bun

This repo uses Bun as the package manager, primarily for the Typescript interpreter features.

Follow the [official guide to Install Bun](https://bun.sh/docs/installation#installing) on your machine.

### 2. Secrets

Locally, the secrets can be populated from a `.env` file. Typically you will use a PAT for testing, but GitHub App authentication is also supported. If you provide both, it will use the App. See `.env.example` for key names.

### 3. Hello World

```sh
bun install
```

Edit `./templates/default/summary.md.vto`.

```sh
URL=https://github.com/ventojs/vento/issues bun render
```

## Husky

This repo uses Husky to lint files before they are committed to the repo. Run `bun run prepare` before committing to install the hooks.

You'll also need to [source your Node and Bun environments](https://github.com/typicode/husky/blob/main/docs/how-to.md#solution).

## Eslint

Eslint rules are marked as errors, but there's no need to fix them manually as you code. If you use VSCode, just press `Shift-Option-F` (Mac) or `Shift-Alt-F` to automatically format the current file.

## Running Actions Locally

Install the `SanjulaGanepola.github-local-actions` VSCode Extension from the recommendations. It will help you install the `nektos/act` Local Action Runner, and Docker if necessary. Open the sidebar tab, and supply the missing secrets and variables.

Make sure to always build your code before running, since it runs the action directly from the `/dist` folder (as specified in the local `action.yml`).
