# Build from source

This archive contains the 0.1.0 source tree. `main.js` is intentionally not shipped stale: build it before enabling the copied folder as an Obsidian plugin.

```bash
npm install
npm run build
```

A successful build creates/updates `main.js` and `styles.css`. The archive intentionally omits `package-lock.json`; `npm install` will generate a lockfile matching `package.json` instead of reusing the inconsistent lockfile from the earlier M6 package.
