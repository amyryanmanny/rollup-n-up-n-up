import { DefaultDict } from "@util/collections";
import { generateSummary } from "./ai/summarize";
import { generateFunSummary } from "./ai/fun";

type MemoryItem = {
  content: string;
  sources: string[];
};

export type MemoryBank = Array<MemoryItem>;

// Singleton
export class Memory {
  private static instance: Memory;

  static getInstance(): Memory {
    if (!Memory.instance) {
      Memory.instance = new Memory();
    }
    return Memory.instance;
  }

  private banks: DefaultDict<number, MemoryBank>;

  private constructor() {
    this.banks = new DefaultDict<number, MemoryBank>(() => []);
  }

  remember(item: MemoryItem, memoryBank: number = 0): void {
    if (item.content.trim() === "") {
      return;
    }

    const bank = this.banks.get(memoryBank);

    // Don't remember the same item twice
    if (bank.some((i) => i.content === item.content)) {
      return;
    }

    bank.push(item);
  }

  getBank(memoryBank: number = 0): MemoryBank {
    const bank = this.banks.get(memoryBank);
    return bank.slice();
  }

  async summarize(
    promptFilePath: string,
    memoryBank: number = 0,
  ): Promise<string> {
    const content = this.getBank(memoryBank);
    if (content.length === 0) {
      // TODO: Point to a doc explaining how memory works
      return "No content in memory to summarize.";
    }

    return await generateSummary({ content, prompt: promptFilePath });
  }

  async summarizeFun(memoryBank: number = 0): Promise<string> {
    const content = this.getBank(memoryBank);
    if (content.length === 0) {
      return "No content in memory to summarize.";
    }

    return await generateFunSummary({ content });
  }

  async query(
    promptFilePath: string,
    query: string,
    memoryBank: number = 0,
  ): Promise<string> {
    const content = this.getBank(memoryBank);
    if (content.length === 0) {
      return "No content in memory to summarize.";
    }

    return await generateSummary({
      content,
      prompt: promptFilePath,
      placeholders: { query },
    });
  }

  headbonk(memoryBank?: number): void {
    if (memoryBank === undefined) {
      this.banks.clear();
    } else if (this.banks.has(memoryBank)) {
      this.banks.delete(memoryBank);
    }
  }
}
