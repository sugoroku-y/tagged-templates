import assert from 'assert';

/**
 * タグ付きテンプレート関数
 */
export type TaggedTemplate<PARAM = unknown, RETURN = string> = (
  template: TemplateStringsArray,
  ...values: PARAM[]
) => RETURN;

/**
 * タグ付きテンプレート関数の生成に使われる関数群
 */
export type TaggedTemplateContext<PARAM = unknown, RETURN = string> = {
  /**
   * テンプレートとしてtemplate.rawを使用するときに指定する。
   *
   * 省略時にはtemplateそのものをテンプレートに使用する。
   */
  withoutUnescaping?: true;
  /**
   * `template`もしくは`template.raw`の各文字列と、そのインデックス、および配列自体を受け取り、変更された文字列を返す関数。
   *
   * 省略時には`template`/`template.raw`内の文字列をそのまま使用する。
   * @param string `template`/`template.raw`内の各文字列
   * @param index 配列内でのインデックス
   * @param template `template`/`template.raw`
   * @returns 実際に結合に使用されるテンプレート文字列を返す。
   */
  modifyTemplate?: (
    string: string,
    index: number,
    template: readonly string[],
  ) => string;
  /**
   * テンプレートに渡された各値とそのインデックスを受け取り、変更されたテンプレート文字列と連結するための文字列を返す関数。
   *
   * 省略時にはvalueをStringで文字列に変換する。
   * @param value テンプレートに渡された各値
   * @param index 配列内でのインデックス
   * @param values テンプレートに渡された値の配列
   * @returns 実際に結合に使用される式に対応する文字列を返す。
   */
  convertValue?: (
    value: PARAM,
    index: number,
    values: readonly PARAM[],
  ) => string;
  /**
   * 最終的に連結された文字列を受け取り、最終的な結果を返す関数。
   *
   * 省略時にはsそのものを最終的な結果とする。
   * @param s 最終的に連結された文字列
   * @returns タグ付きテンプレートの最終的な結果を返す。
   */
  generate?: (s: string) => RETURN;
};

/**
 * カスタマイズ可能なタグ付きテンプレート関数を生成します。
 *
 * @template PARAM テンプレート関数のパラメーターの型。
 * @template RETURN 生成された関数が返す値の型。
 * @param initializeContext タグ付きテンプレートをカスタマイズするための関数群を生成する関数。
 * @returns 生成したタグ付きテンプレート関数を返す。
 */
export function taggedTemplateBase<PARAM = unknown, RETURN = string>(
  initializeContext: (
    template: TemplateStringsArray,
    values: PARAM[],
  ) => TaggedTemplateContext<PARAM, RETURN>,
): TaggedTemplate<PARAM, RETURN>;

/**
 * カスタマイズ可能なタグ付きテンプレート関数を生成します。
 *
 * @template PARAM テンプレート関数のパラメーターの型。
 * @template RETURN 生成された関数が返す値の型。
 * @param initializeContext タグ付きテンプレートをカスタマイズするための関数群。
 * @returns 生成したタグ付きテンプレート関数を返す。
 */
export function taggedTemplateBase<PARAM = unknown, RETURN = string>(
  initializeContext: TaggedTemplateContext<PARAM, RETURN>,
): TaggedTemplate<PARAM, RETURN>;

// taggedTemplateBaseの実装
export function taggedTemplateBase<PARAM = unknown, RETURN = string>(
  initializeContext:
    | TaggedTemplateContext<PARAM, RETURN>
    | ((
        template: TemplateStringsArray,
        values: PARAM[],
      ) => TaggedTemplateContext<PARAM, RETURN>),
): TaggedTemplate<PARAM, RETURN> {
  const initialize =
    typeof initializeContext === 'function'
      ? // テンプレート文字列や値によってコンテキストが変化する場合は生成関数を指定する
        initializeContext
      : // コンテキストが不要な場合は関数群を直接指定してもよい
        () => initializeContext;
  return function taggedTemplate(
    template: TemplateStringsArray,
    ...values: PARAM[]
  ): RETURN {
    try {
      // コンテキストを初期化
      const context = initialize(template, values);
      // タグ付きテンプレートのエスケープシーケンスを解除したものを使うかそのままを使うか
      const templateArray = context.withoutUnescaping ? template.raw : template;
      const modifyTemplate =
        context.modifyTemplate?.bind(context) ??
        // modifyTemplate省略時は改変しない
        (s => s);
      const convertValue =
        context.convertValue?.bind(context) ??
        // convertValue省略時はStringで文字列化
        String;
      const generate =
        context.generate?.bind(context) ??
        // generate省略時は結合した文字列そのものを返す
        (s => s as RETURN);
      const valuesIterator = values[Symbol.iterator]();
      // タグ付きテンプレートの文字列を生成
      const string = ''.concat(
        ...(function* () {
          let index = 0;
          for (const e of templateArray) {
            // タグ付きテンプレートの文字列部分を変更
            yield modifyTemplate(e, index, templateArray);
            const result = valuesIterator.next();
            if (result.done) {
              break;
            }
            // タグ付きテンプレートの式部分を変換
            yield convertValue(result.value, index, values);
            ++index;
          }
        })(),
      );
      // タグ付きテンプレートを結合した文字列から最終的な返値に変換
      return generate(string);
    } catch (ex) {
      assert(ex instanceof Error);
      // 生成した関数までのスタックトレースを取得してエラーを投げる
      Error.captureStackTrace(ex, taggedTemplate);
      throw ex;
    }
  };
}
