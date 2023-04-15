declare global {
  interface String {
    // concatの引数はstringでなくても文字列化してから結合されるのでunknownでよい
    concat(...args: unknown[]): string;
  }
}

export {};
