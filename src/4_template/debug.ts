import type { Template } from "ventojs/src/environment.js";
import type { Memory } from "@transform/memory";

export function debugTemplate(template: Template): string {
  const source = template.source;
  return `<details><summary>Expand to view the full rollup-n-up-n-up template!</summary>\n\n\`\`\`\n${source}\n\`\`\`\n\n</details>`;
}

export function debugMemory(memory: Memory, memoryBank: number): string {
  const context = memory.getBankContent(memoryBank);
  return `<details><summary>Expand to view the context passed into the inference model!</summary>\n\n\`\`\`\n${context}\n\`\`\`\n\n</details>`;
}
