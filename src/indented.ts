import assert from 'assert';
import { error } from './error';
import { unescape } from './unescape';

/**
 * テンプレートの内容からインデントを抽出。
 *
 * テンプレートが不正な場合は例外を投げる(typeがsafe以外のとき)。
 *
 * @param {readonly string[]} template
 * @param type indentedの種類
 * @returns {string}
 */
function extractIndent(
  template: readonly string[],
  isSafe: boolean,
): string | undefined {
  // タグ付きテンプレートとして呼ばれたらtemplate.lengthは1以上になるはず
  if (template.length === 0) {
    return isSafe
      ? undefined
      : error`
      Call as a tagged template.
      `;
  }
  const firstTemplate = template[0];
  assert(firstTemplate !== undefined); // template.lengthが1以上なので、firstTemplateはundefinedではない
  if (firstTemplate.charAt(0) !== '\n') {
    // 先頭には改行がなければならない
    return isSafe
      ? undefined
      : error`
      The beginning must be a newline.
      `;
  }
  const lastTemplate = template[template.length - 1];
  assert(lastTemplate !== undefined); // template.lengthが1以上なので、lastTemplateはundefinedではない
  const [indent] = /(?<=\n)[ \t]*$/.exec(lastTemplate) ?? [];
  if (indent === undefined) {
    // 末尾には行頭から空白もしくはタブのみでなければならない
    return isSafe
      ? undefined
      : error`
      The end must be spaces or tabs only from the beginning of the line.
      `;
  }
  for (const t of template) {
    for (const [lineIndent, emptyLine] of t.matchAll(
      /(?<=\n)(?:(?=(\n))|[ \t]*)/g,
    )) {
      // 空行か行頭に指定のインデントがなければならない
      if (!emptyLine && !lineIndent.startsWith(indent)) {
        return isSafe ? undefined : error`Indentation is not aligned.`;
      }
    }
  }
  return indent;
}

/**
 * indentedの実装
 *
 * @param type テンプレートの種類
 * - default 通常
 * - raw エスケープしない
 * - safe 例外を投げない
 * @param args タグ付きテンプレート関数の引数
 * @returns インデントを取り除いた内容
 * @throws
 * - indentedの仕様に合わない
 *   - 先頭が改行じゃなかった
 *   - 末尾行に空白とタブ以外の文字があった
 *   - 各行の行頭がインデントで統一されていなかった
 * - エスケープ文字が正しくない
 *   - 8進数のエスケープが使用された(単独の'\0'を除く)
 *   - '\8`や`\9`
 *   - `\x`や`\u`で16進数以外の文字が指定された
 *   - `\x`や`\u`で16進数の文字数が不足していた
 *   - `\u{～}`で0x10ffffを超える文字コードが指定された
 */
function indented_implement(
  extendedModifiers: Array<(s: string, index: number) => string>,
  ...args: [TemplateStringsArray, ...unknown[]]
): string {
  try {
    // 行末に`\`があればインデントと一緒に改行を除去するためにrawを使う
    const [{ raw: template }] = args;
    const indent = extractIndent(
      template,
      extendedModifiers[0] === unescape.safe,
    );
    if (indent === undefined) {
      // safeが指定されていてテンプレートが不正だった場合は通常のテンプレートリテラルとほぼ同じにする
      return template.length === 0
        ? ''
        : template.map(unescape.safe).reduce((r, e, i) => r.concat(args[i], e));
    }
    // テンプレートの改変処理
    const modifiers: Array<(s: string, index: number) => string> = [
      s => s.replaceAll('\n' + indent, '\n'),
      // 先頭の改行は除去
      (s, index) => (index === 0 ? s.slice(1) : s),
      // 末尾の改行も除去(末尾のインデントはreplaceで除去済み)
      (s, index) => (index === template.length - 1 ? s.slice(0, -1) : s),
      // 追加の修正
      ...extendedModifiers,
    ];
    return template
      .map((s, index) => modifiers.reduce((r, e) => e(r, index), s))
      .reduce((r, e, i) => r.concat(args[i], e));
  } catch (ex) {
    if (ex instanceof Error) {
      // スタックトレースから内部の呼び出しを除去
      Error.captureStackTrace(ex, indented_implement);
    }
    throw ex;
  }
}

/**
 * テンプレートからインデントを取り除いたものをその内容とするタグ付きテンプレート。
 *
 * 最後の改行から終端の`の前までにある空白もしくはタブをインデントと見なして各行の行頭から取り除く。
 *
 * 先頭は改行で始まり、末尾は改行のあとに空白もしくはタブの連続で終わっていないとエラーとする。
 *
 * また各行の行頭はインデントとして指定した空白もしくはタブの連続と一致しないとエラーとする。
 *
 * ただし、空行についてはインデントと一致していなくてもエラーとはせずに、空行のままとする。
 *
 * 通常のテンプレートリテラルと同様、改行前に`\`があれば、改行が無いものとして扱われる。その際にもインデントは取り除かれる。
 *
 * ```ts
 * function xxx() {
 *   const text = indented`
 *       aaaaaa\
 *       bbbbbb
 *
 *       cccccc
 *       `; // -> 'aaaaaabbbbbb\n\ncccccc'
 *   return text;
 * }
 * ```
 * @returns インデントを取り除いた内容
 */
export const indented: {
  (template: TemplateStringsArray, ...values: unknown[]): string;
  /**
   * {@link indented}の`\`をエスケープしない版。
   *
   * `\`をエスケープしないので、行末に`\`があっても改行を除去しない。
   *
   * ```ts
   * function xxxRaw() {
   *   const text = indented.raw`
   *       aaaaaa\
   *       bbbbbb
   *
   *       cccccc
   *       `; // -> 'aaaaaa\\\nbbbbbb\n\ncccccc'
   *   return text;
   * }
   * ```
   */
  raw(this: void, template: TemplateStringsArray, ...values: unknown[]): string;
  /**
   * {@link indented}の`\u`などで正しくない記述をしている場合でも例外を投げない版。
   * ```ts
   * function xxxSafe() {
   *   const text = indented.safe`
   *       aaaaaa \uXXXX
   *       bbbbbb
   *
   *       cccccc
   *       `; // -> 'aaaaaa uXXXX\nbbbbbb\n\ncccccc'
   *   return text;
   * }
   * ```
   *
   * 正しくないエスケープシーケンスは`\`だけを取り除く。
   */
  safe(
    this: void,
    template: TemplateStringsArray,
    ...values: unknown[]
  ): string;
} = Object.freeze(
  Object.assign(indented_implement.bind(null, [unescape]), {
    raw: indented_implement.bind(null, []),
    safe: indented_implement.bind(null, [unescape.safe]),
  }),
);
