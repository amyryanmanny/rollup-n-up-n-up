import Bun from "bun";

// Render
await Bun.build({
  entrypoints: ["./src/1_trigger/action-render.ts"],
  outdir: "./dist/render",
  target: "node",
  naming: {
    entry: "index.js",
    asset: "[name].[ext]",
  },
  // sourcemap: "inline",
});

// Push
await Bun.build({
  entrypoints: ["./src/5_push/action-push.ts"],
  outdir: "./dist/push",
  target: "node",
  naming: "index.js",
  // sourcemap: "inline",
});
