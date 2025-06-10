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
  private banks: Map<number, string[]>;

  constructor() {
    this.banks = new Map<number, string[]>();
  }

  remember(item: string, bankIndex: number = 0): void {
    if (!item || item.trim() === "") {
      return;
    }

    if (!this.banks.has(bankIndex)) {
      this.banks.set(bankIndex, []);
    }
    const bank = this.banks.get(bankIndex)!;

    if (bank.includes(item)) {
      return;
    }

    bank.push(item);
  }

  private getBank(bankIndex: number = 0): string[] {
    if (!this.banks.has(bankIndex)) {
      return [];
    }
    const bank = this.banks.get(bankIndex)!;
    return bank.slice();
  }

  private getBankContent(bankIndex: number = 0): string {
    const bank = this.getBank(bankIndex);
    return bank.join("\n\n");
  }

  async renderSummary(prompt: string, memoryBank: number = 0): Promise<string> {
    const content = this.getBankContent(memoryBank);
    if (!content || content.trim() === "") {
      return "No content to summarize. Check you have 'render'ed or 'remember'ered content.";
    }

    return await summarize(prompt, content);
  }

  headbonk(bankIndex?: number): void {
    if (bankIndex === undefined) {
      this.banks.clear();
    } else if (this.banks.has(bankIndex)) {
      this.banks.delete(bankIndex);
    }
  }
}
