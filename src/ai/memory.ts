// Singleton
let memory: Memory;

class Memory {
  private strings: string[] = [];

  constructor() {
    this.strings = [];
  }

  remember(item: string): void {
    if (!item || item.trim() === "") {
      return;
    }
    if (this.strings.includes(item)) {
      return;
    }
    this.strings.push(item);
  }

  getAll(): string[] {
    return this.strings;
  }

  headbonk(): void {
    this.strings = [];
  }
}

export function getMemory(): Memory {
  if (!memory) {
    memory = new Memory();
  }
  return memory;
}
