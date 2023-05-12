import { basic } from './basic';
import { indented } from './indented';
import { addSafeUser } from './unescape';

/**
 * Errorをthrowする。
 */
export function error(): never;
/**
 * 指定した文字列をメッセージに持つErrorをthrowする。
 */
export function error(message: string): never;
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
  template: TemplateStringsArray,
  ...values: unknown[]
): never;
// 実装
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
    // 複数行のメッセージにも対応できるように、テンプレートの先頭の文字で切り分ける
    const message =
      !template || typeof template === 'string'
        ? template
        : (template.raw[0]?.charAt(0) === '\n' ? indented : basic)
            // エスケープシーケンスの不備などがあっても最低限のエラーメッセージが出せるように、.safeを使う
            .safe(template, ...values);
    const ex = new clazz(message);
      // スタックトレースからこの関数を除去する
      Error.captureStackTrace(ex, error);
    // 作成したインスタンスをthrowする
    throw ex;
  });
};

Object.freeze(error);
