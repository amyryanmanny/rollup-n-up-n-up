import path from "path";

import { getActionPath, isGitHubAction } from "./github";

export const PUBLIC_PATH = "./assets";

export function getAssetPath(action: "render", fileName?: string): string {
  let assetsPath = path.join("dist", action, PUBLIC_PATH);
  if (isGitHubAction()) {
    assetsPath = getActionPath(assetsPath);
  }
  if (!fileName) {
    return assetsPath;
  }
  return path.join(assetsPath, fileName);
}
