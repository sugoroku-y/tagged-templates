import assert from 'assert';
import { basic } from './basic';
import { unescape, captureStackTrace, addSafeUser } from './unescape';
import { error } from './error';
import { taggedTemplateBase } from './taggedTemplateBase';

class IndentedFormatError extends Error {
  override name = 'IndentedFormatError';
}

function extractIndent(template: readonly string[]): string {
  // タグ付きテンプレートとして呼ばれたらtemplate.lengthは1以上になるはず
  if (template.length === 0) {
    error.as(IndentedFormatError)`Call as a tagged template.`;
  }
  const firstTemplate = template[0];
  assert(firstTemplate !== undefined); // template.lengthが1以上なので、firstTemplateはundefinedではない
  if (firstTemplate.charAt(0) !== '\n') {
    // 先頭の`の直後には改行がなければならない
    error.as(IndentedFormatError)`
          There must be a newline character immediately following the leading \`.
          `;
  }
  const lastTemplate = template[template.length - 1];
  assert(lastTemplate !== undefined); // template.lengthが1以上なので、lastTemplateはundefinedではない
  // 末尾の`から行頭までにある空白/タブ
  const [indent] =
    /(?<=\n)[ \t]*$/.exec(lastTemplate) ??
    // 末尾には行頭から空白もしくはタブのみでなければならない
    error.as(IndentedFormatError)`
            There must be no non-whitespace or non-tab characters between the trailing \
            end \` and the beginning of the line.
            `;
  const illegalBeginningOfLine = new RegExp(`\n(?!\n|${indent})`);
  if (template.some(t => illegalBeginningOfLine.test(t))) {
    // 各行は空行であるか行頭が指定のインデントで始まっていなければならない。
    error.as(IndentedFormatError)`
          Each line must be blank or begin with the indent at the beginning of the line.
          `;
  }
  return indent;
}

function arrangeTemplate(
  searchValue: string,
  s: string,
  index: number,
  template: readonly string[],
): string {
  // 改行の後のインデント(つまり行頭のインデント)を除去
  s = s.split(searchValue).join('\n');
  if (index === 0) {
    // 先頭の改行は除去
    s = s.slice(1);
  }
  if (index === template.length - 1) {
    // 末尾の改行も除去(末尾のインデントはreplaceAllで除去済み)
    s = s.slice(0, -1);
  }
  return s;
}

function prepareTemplate(
  template: TemplateStringsArray,
  arrange: typeof arrangeTemplate,
): readonly string[] {
  // 行末に`\`があればインデントと一緒に改行を除去するためにrawを使う
  const indent = extractIndent(template.raw);
  // テンプレートの改変処理
  const searchValue = `\n${indent}`;
  return template.raw.map((...args) => arrange(searchValue, ...args));
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
export function indented(
  this: void,
  template: TemplateStringsArray,
  ...values: unknown[]
): string {
  try {
    const arranged = prepareTemplate(template, (...args) =>
      unescape(arrangeTemplate(...args)),
    );
    return taggedTemplateBase(arranged, values);
  } catch (ex) {
    assert(ex instanceof Error);
    // スタックトレースから内部の呼び出しを除去
    Error.captureStackTrace(ex, indented);
    throw ex;
  }
}

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
indented.raw = function indentedRaw(
  this: void,
  template: TemplateStringsArray,
  ...values: unknown[]
): string {
  const arranged = prepareTemplate(template, arrangeTemplate);
  return taggedTemplateBase(arranged, values);
};

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
indented.safe = addSafeUser(function indentedSafe(
  this: void,
  template: TemplateStringsArray,
  ...values: unknown[]
): string {
  try {
    const arranged = prepareTemplate(template, (...args) =>
      unescape.safe(arrangeTemplate(...args)),
    );
    return taggedTemplateBase(arranged, values);
  } catch (ex) {
    assert(ex instanceof Error);
    // 書式不正は警告ログに出しておく
    console.warn(`${ex.message}\n${captureStackTrace()}`);
    // unescape.safeが使われているときの例外は書式不正のみ(のはずだが万一を考えてチェックはしない)なのでbasic.safeで処理
    return basic.safe(template, ...values);
  }
});

Object.freeze(indented);
