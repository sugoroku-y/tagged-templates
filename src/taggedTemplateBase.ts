import assert from 'assert';

/**
 * タグ付きテンプレート関数の生成に使われる関数群
 */
export type TaggedTemplateContext<PARAM = unknown, RETURN = string> = {
  /**
   * テンプレートを受け取り、値と連結される文字列の配列を返す関数。
   *
   * 省略時にはtemplateそのものがそのものを結合に使用する。
   * @param template タグ付きテンプレートに渡されたテンプレート文字列の配列
   * @returns タグ付きテンプレートの文字列として使用される配列を返す。
   *
   * 通常はtemplateそのものかrawプロパティを返す。
   */
  prepareTemplate?: (template: TemplateStringsArray) => readonly string[];
  /**
   * `prepareTemplate` が返す配列の各文字列と、そのインデックス、および配列自体を受け取り、変更された文字列を返す関数。
   *
   * 省略時には`prepareTemplate`が返す配列内の文字列をそのまま使用する。
   * @param string `prepareTemplate` が返す配列の各文字列
   * @param index 配列内でのインデックス
   * @param template `prepareTemplate` が返す配列
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
 * template.rawをそのまま返す、prepareTemplateの実装。
 *
 * templateをそのまま返すprepareTemplateの実装はprepareTemplateを省略すればいいだけなので用意しない。
 */
export function prepareTemplateRaw({
  raw,
}: TemplateStringsArray): readonly string[] {
  return raw;
}

/**
 * カスタマイズ可能なタグ付きテンプレート関数を生成します。
 *
 * @template PARAM テンプレート関数のパラメーターの型。
 * @template RETURN 生成された関数が返す値の型。
 * @param initializeContext
 *   タグ付きテンプレートをカスタマイズするための関数群、もしくは関数群を生成する関数。
 * 
 *   省略時にはデフォルトの実装となる。
 * @returns {(template: TemplateStringsArray, ...values: PARAM[]) => RETURN}
      生成したタグ付きテンプレート関数を返す。
 */
export function taggedTemplateBase<PARAM = unknown, RETURN = string>(
  initializeContext?:
    | TaggedTemplateContext<PARAM, RETURN>
    | ((
        template: TemplateStringsArray,
        values: PARAM[],
      ) => TaggedTemplateContext<PARAM, RETURN>),
): (template: TemplateStringsArray, ...values: PARAM[]) => RETURN {
  return function taggedTemplate(
    template: TemplateStringsArray,
    ...values: PARAM[]
  ): RETURN {
    try {
      // コンテキストを初期化
      const context =
        typeof initializeContext === 'function'
          ? // テンプレート文字列や値によってコンテキストが変化する場合は生成関数を指定する
            initializeContext(template, values)
          : // コンテキストが不要な場合は関数群を直接指定してもよい
            initializeContext;
      // タグ付きテンプレートの文字列を生成
      const string = ''.concat(
        ...(function* () {
          // タグ付きテンプレートの文字列部分を変換
          const templateArray =
            context?.prepareTemplate?.(template) ?? template;
          const valuesIterator = values[Symbol.iterator]();
          let index = 0;
          for (const e of templateArray) {
            // タグ付きテンプレートの文字列部分を変更
            yield context?.modifyTemplate?.(e, index, templateArray) ?? e;
            const {
              done,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- doneがfalseのときしかvalueにはアクセスしないのでanyにはならない
              value,
            } = valuesIterator.next();
            if (done) {
              break;
            }
            // タグ付きテンプレートの式部分を変換
            yield context?.convertValue?.(value, index, values) ??
              String(value);
            ++index;
          }
        })(),
      );
      // タグ付きテンプレートを結合した文字列から最終的な返値に変換
      return context?.generate !== undefined
        ? context.generate(string)
        : // generate省略時は結合した文字列を返す
          (string as RETURN);
    } catch (ex) {
      assert(ex instanceof Error);
      // 生成した関数までのスタックトレースを取得してエラーを投げる
      Error.captureStackTrace(ex, taggedTemplate);
      throw ex;
    }
  };
}
