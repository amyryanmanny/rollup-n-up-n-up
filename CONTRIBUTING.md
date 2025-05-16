# Contributing

## Bun

This repo uses Bun as the package manager, primarily for the Typescript interpreter features, and because the name is cute.

Follow the [official guide to Install Bun](https://bun.sh/docs/installation#installing) on your machine.

## Secrets

Locally, the secrets can be populated from a `.env` file. Typically you will use a PAT for testing, but GitHub App authentication is also supported. If you provide both, it will use the App. See `.env.example` for key names.

## Husky

This repo uses Husky to lint files before they are committed to the repo. Run `bun run prepare` before committing to install the hooks.

## Eslint

Eslint rules are marked as errors, but there's no need to fix them manually as you code. If you use VSCode, just press `Shift-Option-F` (Mac) or `Shift-Alt-F` to automatically format the current file.
