import { indented } from './indented';

function prepare<ERROR extends object>(
  clazz: new (message?: string) => ERROR,
): (template: TemplateStringsArray, ...values: unknown[]) => never {
  return function error(...args: [TemplateStringsArray, ...unknown[]]): never {
    // エラーメッセージを含むERRORのインスタンスを作成する
    const ex = new clazz(indented.safe(...args));
    // スタックトレースからこの関数を除去する
    Error.captureStackTrace(ex, error);
    // 作成したインスタンスをthrowする
    throw ex;
  };
}

/**
 * テンプレート文字列として指定されたメッセージを持つ例外を生成してthrowするタグ付きテンプレート。
 *
 * ```ts
 * const type =
 *   value === 'aaa'
 *   ? 'typeA'
 *   : value === 'bbb'
 *   ? 'typeB'
 *   : error`Unknown value: ${value}`;
 * ```
 */
export const error: {
  (template: TemplateStringsArray, ...values: unknown[]): never;
  /**
   * throwする例外クラスを指定したerrorタグ付きテンプレートを返す。
   *
   * ```ts
   * error.for(SyntaxError)`
   *   Invalid Unicode character
   *   ${line}
   *   ${' '.repeat(col)}^
   *   `;
   * ```
   */
  for<ERROR extends object>(
    this: void,
    clazz: new (message?: string) => ERROR,
  ): (...args: [TemplateStringsArray, ...unknown[]]) => never;
} = Object.freeze(
  // error_implement関数をベースにerror関数を定義する
  Object.assign(prepare(Error), {
    // error_implement関数の第1引数にclazzを指定した関数を返す
    for<ERROR extends object>(clazz: new (message?: string) => ERROR) {
      return prepare(clazz);
    },
  }),
);
