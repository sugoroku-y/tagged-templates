import { indented } from './indented';

/**
 * 引数に渡されたメッセージをもとに例外クラスERRORのインスタンスを作成してthrowする。
 * @template ERROR 例外クラス
 * @param clazz throwする例外クラスのコンストラクタ
 * @param args メッセージを生成するためのテンプレート引数
 */
function error_implement<ERROR extends object>(
  clazz: new (message?: string) => ERROR,
  ...args: [TemplateStringsArray, ...unknown[]]
): never {
  // エラーメッセージを含むERRORのインスタンスを作成する
  const ex = new clazz(indented.safe(...args));
  // スタックトレースからこの関数を除去する
  Error.captureStackTrace(ex, error_implement);
  // 作成したインスタンスをthrowする
  throw ex;
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
  Object.assign(error_implement.bind(null, Error), {
    // error_implement関数の第1引数にclazzを指定した関数を返す
    for<ERROR extends object>(clazz: new (message?: string) => ERROR) {
      return error_implement.bind(null, clazz);
    },
  }),
);
