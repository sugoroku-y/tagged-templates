import type { TaggedTemplate } from './TaggedTemplate';
import { basic } from './basic';
import { indented } from './indented';
import { addSafeUser } from './unescape';

type ErrorTaggedTemplate = (
  ...args: [string?] | Parameters<TaggedTemplate>
) => never;

function as<ERROR extends object>(
  clazz: new (message?: string) => ERROR,
): ErrorTaggedTemplate {
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
    if (typeof ex === 'object') {
      // スタックトレースからこの関数を除去する
      Error.captureStackTrace(ex, error);
    }
    // 作成したインスタンスをthrowする
    throw ex;
  });
}

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
export const error: ErrorTaggedTemplate & {
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
  readonly as: <ERROR extends object>(
    this: void,
    clazz: new (message?: string) => ERROR,
  ) => ErrorTaggedTemplate;
} = Object.freeze(Object.assign(as(Error), { as }));
