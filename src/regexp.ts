type AllCombination<
  STR extends string,
  PRE extends string = '',
> = STR extends `${infer FIRST}${infer POST}`
  ?
      | `${FIRST}${AllCombination<`${PRE}${POST}`>}`
      | AllCombination<POST, `${PRE}${FIRST}`>
  : '';

export function regexp(
  ...args: [
    TemplateStringsArray,
    ...Array<string | RegExp | { flags: AllCombination<'dgimsuy'> }>,
  ]
): RegExp {
  let flags = '';
  const pattern = args[0].raw
    // - エスケープされた文字は残す
    //   `\/\/ aaaaaa`
    //   -> '\\/\\/ aaaaaa'
    // - 改行と隣接しない連続した空白とタブは一つの空白に置換
    //   `aaa    bbb` -> 'aaa bbb'に置換
    // - コメントは除去
    //   `// aaaaaa` -> 除去
    //   `/* aaaaaa */` -> 除去
    // - 改行とその前後の空白とタブは除去
    //   `  \n  ` -> 除去
    .map(s =>
      s.replace(
        /(\\.)|((?<![ \t\n])[ \t]+(?![ \t\n]))|\/\/.*|\/\*[\s\S]*?\*\/|[ \t]*\n[ \t]*/g,
        (_, escaped?: string, spaces?: string) =>
          escaped ?? (spaces ? ' ' : ''),
      ),
    )
    .reduce((r, e, i) => {
      const value = args[i];
      // フラグが指定されていればマージ
      if (typeof value === 'object' && 'flags' in value) {
        for (const flag of value.flags) {
          if (!flags.includes(flag)) {
            flags += flag;
          }
        }
      }
      const pattern =
        value instanceof RegExp
          ? // 正規表現はそのパターンをそのまま、前後に影響が出ないように`(?:～)`で囲む
            `(?:${value.source})`
          : typeof value === 'string'
          ? // 文字列が指定されたら正規表現の特殊文字をエスケープして挿入。
            value.replace(/[[\](){}.?+*|^$\\]/g, '\\$&')
          : // 上記以外は除去
            '';
      return r.concat(pattern, e);
    });
  return new RegExp(pattern, flags);
}
