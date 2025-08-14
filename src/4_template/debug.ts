import { type Template } from "ventojs/src/environment.js";

import { Memory } from "@transform/memory";
import { UpdateDetection } from "@config";

function formatDetails(summary: string, dropdown: string): string {
  return `<details><summary>${summary}</summary>\n\n\`\`\`\n${dropdown}\n\`\`\`\n\n</details>`;
}

export function debugTemplate(template: Template): string {
  return formatDetails("Rollup-n-up-n-up Template", template.source);
}

export function debugMemory(memoryBank: number): string {
  return formatDetails(
    "Inference Model Context",
    Memory.getInstance()
      .getBank(memoryBank)
      .map((item) => item.content)
      .join("\n\n"),
  );
}

export function debugSources(): string {
  const bank = Memory.getInstance().getBank();
  const sourcesList = bank
    .map((item) => item.sources)
    .flat()
    .join("\n");
  return formatDetails("Report Sources", sourcesList);
}

export function debugUpdateDetection(): string {
  const updateDetection = UpdateDetection.getInstance();
  return formatDetails("Update Detection Strategies", updateDetection.debug());
}

export function overrideUpdateDetection(configBlob: string): void {
  // Allow overriding UpdateDetection from the template for testing
  const updateDetection = UpdateDetection.getInstance();
  updateDetection.setStrategies(configBlob);
}
