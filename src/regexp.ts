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

/**
 * 正規表現を生成するタグ付きテンプレート
 *
 * @param {TemplateStringsArray} template テンプレート文字列
 *
 * 正規表現ではエスケープシーケンスが多用されるため`raw`プロパティが使用される。
 *
 * テンプレート文字列は以下のように修正されて使用される。
 *
 * - 1行コメント、ブロックコメントは除去する。
 * - 改行、空白、タブは除去する。
 *   - ただし、前後に英数字がある場合は`\s+`に置き換える。
 * - エスケープされている場合(`\/*`や`\ `など)は上記の対象外
 * @param {Array<string | object>} values テンプレートに挿入される値
 * - 文字列値が正規表現の特殊文字を含んでいる場合、エスケープしてから挿入。
 * - `source`プロパティを持つオブジェクトは、その`source`プロパティを`(?:～)`で囲って挿入。
 * - `flags`プロパティを持つオブジェクトは、そのすべての`flags`プロパティをマージしたものを生成するRegExpに指定。
 * - 上記以外は無視。
 * @returns {RegExp} テンプレート文字列と挿入される値から生成したパターンとフラグを指定して生成された正規表現を返す。
 */
export function regexp(
  template: TemplateStringsArray,
  ...values: Array<
    // 文字列値は正規表現の特殊文字をエスケープして挿入
    | string
    // `source`プロパティがあるオブジェクトはその`source`プロパティを`(?:～)`で囲って挿入
    | { source: string }
    // `flags`プロパティがあるオブジェクトはその`flags`プロパティをマージしたものをフラグとして使用する。
    | { flags: RegExpFlags }
    // 両方あってもいい
    | { source: string; flags?: RegExpFlags }
  >
): RegExp {
  const { source, flags } = regexp.sub(template, ...values);
  return new RegExp(source, flags);
}

/**
 * {@link regexp}と同じ書式で、返値がRegExpではなく`source`プロパティと`flags`プロパティを持つオブジェクトを返す。
 *
 * `source`を正規表現として解釈しないので、{@link regexp}の挿入値としての正規表現パターンを生成するときに利用する。
 */
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
          /** マッチした文字列 */
          match,
          /** エスケープシーケンスかどうか */
          escaped: string | undefined,
          /** マッチしたところの直前に英数字があるかどうか */
          pre: string | undefined,
          /** マッチしたところの直後に英数字があるかどうか */
          post: string | undefined,
        ) =>
          escaped
            ? // エスケープされていればそのまま
              match
            : pre && post && match.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
            ? // 前後に英数字があって、コメント除去しても空文字列でない=連続した空白文字があったら1文字以上の空白文字に
              '\\s+'
            : // その他は削除
              '',
      ),
    )
    .reduce((r, e, i) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- タグ付きテンプレートで挿入される値なので範囲外ではない
      const value = args[i]!;
      const pattern =
        typeof value === 'string'
          ? // 文字列が指定されたら正規表現の特殊文字をエスケープして挿入。
            value.replace(/[[\](){}.?+*|^$\\]/g, '\\$&')
          : ('flags' in value &&
              // フラグが指定されていればマージ
              (flags += [...value.flags]
                // flagsにないものだけを追加
                .filter(flag => !flags.includes(flag))
                .join('')),
            'source' in value
              ? // 正規表現はそのパターンをそのまま、ただし前後に影響が出ないように`(?:～)`で囲んで挿入
                `(?:${value.source})`
              : // 上記以外は除去
                '');
      return r.concat(pattern, e);
    });
  return { source, flags };
};

Object.freeze(regexp);
