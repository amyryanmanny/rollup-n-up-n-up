import { DefaultDict } from "@util/collections";
import { summarize as _summarize, query as _query } from "./ai/summarize";

// Singleton
export class Memory {
  static instance: Memory;

  static getInstance(): Memory {
    if (!Memory.instance) {
      Memory.instance = new Memory();
    }
    return Memory.instance;
  }

  private banks: DefaultDict<number, string[]>;

  private constructor() {
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

  getBankContent(memoryBank: number = 0): string {
    const bank = this.getBank(memoryBank);
    return bank.join("\n\n");
  }

  async summarize(
    promptFilePath: string,
    memoryBank: number = 0,
  ): Promise<string> {
    const content = this.getBankContent(memoryBank);
    if (!content || content.trim() === "") {
      // TODO: Point to a doc explaining how memory works
      return "No content in memory to summarize.";
    }

    return await _summarize(content, promptFilePath);
  }

  async query(
    promptFilePath: string,
    query: string,
    memoryBank: number = 0,
  ): Promise<string> {
    const content = this.getBankContent(memoryBank);
    if (!content || content.trim() === "") {
      return "No content in memory to summarize.";
    }

    return await _query(content, query, promptFilePath);
  }

  headbonk(memoryBank?: number): void {
    if (memoryBank === undefined) {
      this.banks.clear();
    } else if (this.banks.has(memoryBank)) {
      this.banks.delete(memoryBank);
    }
  }
}
