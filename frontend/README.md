# Slurm-web frontend

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

When running `npm run dev` you can simulate hosting the UI under any URL prefix
by setting the `VITE_BASE_PATH` environment variable. For example:

```sh
VITE_BASE_PATH=/slurm-web/ npm run dev
```
Leave `VITE_BASE_PATH` unset (or `/`) to serve the app from the root as usual.

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

Production builds default to the placeholder base path `/__SLURMWEB_BASE__`
whenever `VITE_BASE_PATH` is not provided. When the Python gateway starts it
copies the built UI into a temporary runtime directory, replacing every
`/__SLURMWEB_BASE__` occurrence with the configured public URL prefix. This makes
the same build usable under any path without rebuilding.

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

### Static Type-Check

```sh
npm run type-check
```

### Unit tests

```sh
npm run test:unit
```
