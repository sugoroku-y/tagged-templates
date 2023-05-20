import assert from 'assert';
import { IndentedSafeContext } from './indented';
import { taggedTemplateBase } from './taggedTemplateBase';
import { addSafeUser, captureStackTrace, unescape } from './unescape';

/**
 * エラーメッセージ生成用タグ付きテンプレート。
 *
 * 最初が改行文字の場合はindented.safeと同じ、それ以外はbasic.safeと同じ書式でメッセージを構築する。
 *
 * 書式に不備があった場合はwarnログにエラー内容が出力される。
 */
const errorTaggedTemplate = taggedTemplateBase(template => {
  try {
    if (template.raw[0]?.charAt(0) === '\n') {
      // 複数行のメッセージにも対応できるように、テンプレートの先頭の文字で切り分ける
      return new IndentedSafeContext(template);
    }
  } catch (ex) {
    assert(ex instanceof Error);
    console.warn(`${ex.message}\n${captureStackTrace()}`);
  }
  // エスケープシーケンスの不備などがあっても最低限のエラーメッセージが出せるように、basic.safeとおなじcontextを使う
  return {
    withoutUnescaping: true,
    modifyTemplate: unescape.safe,
  };
});

/**
 * テンプレートから生成した文字列をメッセージに持つErrorをthrowするタグ付きテンプレート。
 *
 * メッセージの構築にはテンプレート文字列の最初が改行なら{@link indented.safe}を、改行以外であれば{@link basic.safe}を使用する。
 *
 * - 複数行のメッセージでもインデントが付けられて読みやすい。
 * - エスケープシーケンスの不備などがあっても最低限の情報はわかる。
 * @example
 * ```ts
 * const type =
 *   value === 'aaa'
 *   ? 'typeA'
 *   : value === 'bbb'
 *   ? 'typeB'
 *   : error`Unknown value: ${value}`;
 * ```
 */
export function error(
  ...args: [string?] | [TemplateStringsArray, ...unknown[]]
): never {
  return error.as(Error)(...args);
}

/**
 * clazzで指定したクラスをthrowするタグ付きテンプレートを返す。
 *
 * @example
 * ```ts
 * error.as(SyntaxError)`
 *   Invalid Unicode character
 *   ${line}
 *   ${' '.repeat(col)}^
 *   `;
 * ```
 */
error.as = function as(
  clazz: new (message?: string) => Error,
): (...args: [string?] | [TemplateStringsArray, ...unknown[]]) => never {
  return addSafeUser(function error(...args) {
    const [template, ...values] = args;
    const message =
      !template || typeof template === 'string'
        ? template
        : errorTaggedTemplate(template, ...values);
    const ex = new clazz(message);
    // スタックトレースからこの関数を除去する
    Error.captureStackTrace(ex, error);
    // 作成したインスタンスをthrowする
    throw ex;
  });
};

Object.freeze(error);
