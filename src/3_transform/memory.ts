import { DefaultDict } from "@util/collections";
import { summarize } from "./ai/summarize";

// Singleton
let memory: Memory;

export function getMemory(): Memory {
  if (!memory) {
    memory = new Memory();
  }
  return memory;
}

class Memory {
  private banks: DefaultDict<number, string[]>;

  constructor() {
    this.banks = new DefaultDict<number, string[]>(() => []);
  }

  remember(item: string, memoryBank: number = 0): void {
    if (item.trim() === "") {
      return;
    }

    const bank = this.banks.get(memoryBank);

    // Don't remember the same item twice
    if (bank.includes(item)) {
      return;
    }

    bank.push(item);
  }

  private getBank(memoryBank: number = 0): string[] {
    const bank = this.banks.get(memoryBank);
    return bank.slice();
  }

  private getBankContent(bankIndex: number = 0): string {
    const bank = this.getBank(bankIndex);
    return bank.join("\n\n");
  }

  async summarize(prompt: string, memoryBank: number = 0): Promise<string> {
    if (!prompt || prompt.trim() === "") {
      throw new Error("Prompt cannot be empty.");
    }

    const content = this.getBankContent(memoryBank);
    if (!content || content.trim() === "") {
      // TODO: Point to a doc explaining how memory works
      return "No content to summarize.";
    }

    return await summarize(content, prompt);
  }

  headbonk(memoryBank?: number): void {
    if (memoryBank === undefined) {
      this.banks.clear();
    } else if (this.banks.has(memoryBank)) {
      this.banks.delete(memoryBank);
    }
  }
}
