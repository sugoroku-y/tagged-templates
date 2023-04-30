type AllCombinations<
  STR extends string,
  PRE extends string = '',
> = STR extends `${infer FIRST}${infer POST}`
  ?
      | `${FIRST}${AllCombinations<`${PRE}${POST}`>}`
      | AllCombinations<POST, `${PRE}${FIRST}`>
  : '';

// 正規表現のフラグに指定できる文字列
type RegExpFlags = AllCombinations<'dgimsuy'>;

export function regexp(
  template: TemplateStringsArray,
  ...values: Array<
    | string
    | { source: string }
    | { flags: RegExpFlags }
    | { source: string; flags?: RegExpFlags }
  >
): RegExp {
  const { source, flags } = regexp.sub(template, ...values);
  return new RegExp(source, flags);
}

regexp.sub = function sub(...args: Parameters<typeof regexp>): {
  source: string;
  flags: RegExpFlags;
} {
  let flags: RegExpFlags = '';
  const source = args[0].raw
    // - エスケープされた文字は残す
    //   `\/\/ aaaaaa`
    //   -> '\\/\\/ aaaaaa'
    // - コメントは除去
    //   `// aaaaaa` -> 除去
    //   `/* aaaaaa */` -> 除去
    // - 英数字の間の連続した空白とタブは1文字以上の空白文字(`\s+`)に置換
    //   `aaa    bbb` -> 'aaa\s+bbb'
    // - その他の空白とタブは除去
    //   `aaa  \n  ` -> 'aaa'
    // - ${~}部分については実際に挿入される値が英数字かどうかにかかわらず、何もないものと見なされる
    //   つまり${~}の直前や直後に空白があれば除去
    .map(s =>
      s.replace(
        /(\\)[\s\S]|(?<=(\w)?)(?:\/\/.*|\/\*[\s\S]*?\*\/|\s+)+(?=(\w)?)/g,
        (
          match,
          escaped: string | undefined,
          pre: string | undefined,
          post: string | undefined,
        ) =>
          escaped
            ? // エスケープされていればそのまま
              match
            : pre && post && match.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
            ? // 前後に英数字があって、コメント除去しても空文字列でない => 連続した空白があったら1文字以上の空白文字に
              '\\s+'
            : // その他は削除
              '',
      ),
    )
    .reduce((r, e, i) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const value = args[i]!;
      // フラグが指定されていればマージ
      if (typeof value === 'object' && 'flags' in value) {
        for (const flag of value.flags) {
          if (!flags.includes(flag)) {
            flags += flag;
          }
        }
      }
      const pattern =
        typeof value === 'string'
          ? // 文字列が指定されたら正規表現の特殊文字をエスケープして挿入。
            value.replace(/[[\](){}.?+*|^$\\]/g, '\\$&')
          : 'source' in value
          ? // 正規表現はそのパターンをそのまま、ただし前後に影響が出ないように`(?:～)`で囲んで挿入
            `(?:${value.source})`
          : // 上記以外は除去
            '';
      return r.concat(pattern, e);
    });
  return { source, flags };
};
