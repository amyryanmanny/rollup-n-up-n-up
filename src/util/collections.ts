export class DefaultDict<K, V> extends Map<K, V> {
  constructor(private readonly defaultFn: (key: K) => V) {
    super();
  }

  override get(key: K): V {
    if (this.has(key)) {
      return super.get(key)!;
    }
    const val = this.defaultFn(key);
    this.set(key, val);
    return val;
  }
}
