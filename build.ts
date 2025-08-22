import Bun from "bun";

import { PUBLIC_PATH } from "@config";

// Render
await Bun.build({
  entrypoints: ["./src/1_trigger/action-render.ts"],
  outdir: "./dist/render",
  target: "node",
  sourcemap: "inline",
  naming: {
    entry: "index.js",
    asset: `${PUBLIC_PATH}/[name].[ext]`,
  },
  publicPath: PUBLIC_PATH,
});

// Push
await Bun.build({
  entrypoints: ["./src/5_push/action-push.ts"],
  outdir: "./dist/push",
  target: "node",
  sourcemap: "inline",
  naming: "index.js",
});
