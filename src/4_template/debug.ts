import type { Template } from "ventojs/src/environment.js";
import { Memory } from "@transform/memory";
import { SummaryCache } from "@transform/ai/cache";

function formatDetails(summary: string, dropdown: string): string {
  return `<details><summary>${summary}</summary>\n\n\`\`\`\n${dropdown}\n\`\`\`\n\n</details>`;
}

export function debugTemplate(template: Template): string {
  return formatDetails(
    "Expand to view the full rollup-n-up-n-up template!",
    template.source,
  );
}

export function debugMemory(memoryBank: number): string {
  return formatDetails(
    "Expand to view the context passed into the inference model!",
    Memory.getInstance()
      .getBank(memoryBank)
      .map((item) => item.content)
      .join("\n\n"),
  );
}

export function debugSources(): string {
  const sources = SummaryCache.getInstance().sources();
  const sourcesBulletList = sources.map((source) => `- ${source}`).join("\n");
  return formatDetails(
    "Expand to view the sources used in the inference model!",
    sourcesBulletList,
  );
}
