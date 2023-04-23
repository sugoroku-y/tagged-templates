import type { TaggedTemplate } from './TaggedTemplate';

type AllCombination<
  STR extends string,
  PRE extends string = '',
> = STR extends `${infer FIRST}${infer POST}`
  ?
      | `${FIRST}${AllCombination<`${PRE}${POST}`>}`
      | AllCombination<POST, `${PRE}${FIRST}`>
  : '';

export const regexp: TaggedTemplate<
  RegExp,
  string | RegExp | { flags: AllCombination<'dgimsuy'> }
> = function regexp(...args) {
  let flags = '';
  const pattern = args[0].raw
    // - エスケープされた文字は残す
    //   `\/\/ aaaaaa`
    //   -> '\\/\\/ aaaaaa'
    // - コメントは除去
    //   `// aaaaaa` -> 除去
    //   `/* aaaaaa */` -> 除去
    // - 英数字の間の連続した空白とタブは一つの空白に置換
    //   `aaa    bbb` -> 'aaa bbb'
    // - その他の空白とタブは除去
    //   `aaa  \n  ` -> 'aaa'
    // - ${~}部分については実際に挿入される値が英数字かどうかにかかわらず、何もないものと見なされる
    //   つまり直後に空白があれば除去される。
    .map(s =>
      s.replace(
        /\\[\s\S]|(?<=(\w)?)(?:\/\/.*|\/\*[\s\S]*?\*\/|\s+)+(?=(\w)?)/g,
        (match, pre: string | undefined, post: string | undefined) =>
          match.charAt(0) === '\\'
            ? // エスケープされていればそのまま
              match
            : pre && post && match.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
            ? // 前後に英数字があって、コメント除去しても空文字列でない => 連続した空白があったら一つの空白に
              ' '
            : // その他は削除
              '',
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
          ? // 正規表現はそのパターンをそのまま、ただし前後に影響が出ないように`(?:～)`で囲んで挿入
            `(?:${value.source})`
          : typeof value === 'string'
          ? // 文字列が指定されたら正規表現の特殊文字をエスケープして挿入。
            value.replace(/[[\](){}.?+*|^$\\]/g, '\\$&')
          : // 上記以外は除去
            '';
      return r.concat(pattern, e);
    });
  return new RegExp(pattern, flags);
};
