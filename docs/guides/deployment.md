<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Build commands and hosting reference for all deployment modes: static, PWA, local, and Electron, plus custom build flag documentation.
@sidecar deployment.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

<!--
SpecRefs: TPL-034
-->

# Deployment guide

How to build and deploy the starter app for different hosting scenarios.

## Build commands

| Command              | Mode       | Output | Description                     |
|----------------------|------------|--------|---------------------------------|
| `pnpm build`         | hosted     | dist/  | Default static build            |
| `pnpm build:hosted`  | hosted     | dist/  | Explicit hosted build (+ clean) |
| `pnpm build:pwa`     | pwa        | dist/  | PWA with SW + manifest          |
| `pnpm build:local`   | local      | dist/  | Local file:// compatible        |
| `pnpm build:electron`| electron   | dist/  | For Electron wrapper            |

All commands produce a self-contained `dist/` directory. No bundler is used;
the build script copies source files and patches `index.html` for the target mode.

## Static hosting

### Any static file server

```bash
pnpm build:hosted
# Upload dist/ contents to your server
```

The app uses only relative paths, so it works in any subdirectory.

### GitHub Pages

```bash
pnpm build:hosted
# Push dist/ to gh-pages branch or configure GitHub Pages to serve from dist/
```

### Netlify / Vercel / Cloudflare Pages

Point the build command to `pnpm build:hosted` and the publish directory to `dist/`.

### Nginx

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/my-app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## PWA hosting

PWA requires HTTPS. See [pwa.md](pwa.md) for full PWA setup.

```bash
pnpm build:pwa
# Deploy dist/ to any HTTPS server
```

## Local distribution

```bash
pnpm build:local
cd dist && zip -r ../app.zip . && cd ..
# Share app.zip — recipients open index.html directly
```

## Custom build options

The build script accepts flags directly:

```bash
node scripts/build-single.mjs --mode pwa --out build --clean
```

| Flag          | Default  | Description                                          |
|---------------|----------|------------------------------------------------------|
| `--mode`      | hosted   | Target mode                                          |
| `--out`       | dist     | Output directory (relative to root)                  |
| `--clean`     | false    | Remove output dir before build                       |
| `--treeshake` | false    | Copy only modules referenced in the import graph     |

See [tree-shaking.md](tree-shaking.md) for details on the `--treeshake` flag.

## What the build does

1. Creates the output directory (cleans it first if `--clean`).
2. Copies `modules/` (hex domain modules needed by app imports).
3. Copies starter app files appropriate for the mode.
4. For PWA mode: includes `manifest.json`, `sw.mjs`, `icons/`, `pwa/`.
5. For PWA mode: uncomments the `<meta name="app-mode" content="pwa">` tag.

No transpilation, bundling, or minification. The output is raw ES modules
served directly by the browser. Add a bundler step if you need minification
or legacy browser support.
