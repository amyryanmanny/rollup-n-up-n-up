import path from "path";

export const PUBLIC_PATH = "./assets";

export function getAssetPath(fileName?: string): string {
  // Only works when running the index.js bundle
  const assetsPath = path.join(import.meta.dirname, PUBLIC_PATH);
  if (!fileName) {
    return assetsPath;
  }
  return path.join(assetsPath, fileName);
}
