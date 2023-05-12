import assert from 'assert';

export function prepareTemplate(
  template: TemplateStringsArray,
): readonly string[] {
  return template;
}

prepareTemplate.raw = function prepareTemplateRaw({
  raw,
}: TemplateStringsArray): readonly string[] {
  return raw;
};

/*
 * タグ付きテンプレートの実装
 *
 * @export
 * @template PARAM 挿入する値の型
 * @template CONTEXT タグ付きテンプレートの実装内で使用するcontextの型
 * @template RETURN タグ付きテンプレートの返値の型
 * @param {{
 *     initializeContext?: (
 *       template: TemplateStringsArray,
 *       values: PARAM[],
 *     ) => CONTEXT;
 *     prepareTemplate?: (
 *       this: CONTEXT,
 *       template: TemplateStringsArray,
 *     ) => readonly string[];
 *     convertValue?: (
 *       this: CONTEXT,
 *       value: PARAM,
 *     ) => string;
 *     generate?: (
 *       s: string,
 *       context: CONTEXT,
 *     ) => RETURN;
 * }} [methods={}] タグ付きテンプレートの実装でカスタマイズ可能な箇所をそれぞれ指定する。この引数も各プロパティも省略可能。
 * - initializeContext contextを初期化する。
 * - prepareTemplate 使用するテンプレート文字列の配列を用意する。
 * - modifyTemplate prepareTemplateで返したテンプレート文字列の配列に対してそれぞれの要素に適用される関数適用される関数
 * - convertValue テンプレートに挿入される値を文字列に変換する。
 * - generate テンプレート文字列を値から生成された文字列を元に最終的な返値を生成する。
 * @returns {(template: TemplateStringsArray, ...values: PARAM[]) => RETURN} タグ付きテンプレート関数を返す。
 * */
export function taggedTemplateBase<
  PARAM = unknown,
  CONTEXT = undefined,
  RETURN = string,
>(
  methods: {
    /**
     * contextを初期化する。
     *
     * initializeContextが省略された場合、undefinedを返す関数が使用される。
     * @param template タグ付きテンプレートに指定されたテンプレート文字列の配列
     * @param values タグ付きテンプレートに指定された値の配列
     * @returns タグ付きテンプレート内で使用されるインスタンス。
     *
     * タグ付きテンプレートの呼び出しごとに一つのコンテキストが生成される。
     */
    initializeContext?: (
      template: TemplateStringsArray,
      values: PARAM[],
    ) => CONTEXT;
    /**
     * 使用するテンプレート文字列の配列を用意する。
     *
     * prepareTemplateが省略された場合、templateを返す関数が使用される。
     * @this {CONTEXT} initializeContextで生成されたインスタンス。
     * @param template タグ付きテンプレートに指定されたテンプレート文字列の配列
     * @returns 実際のタグ付きテンプレートで使用するテンプレート文字列の配列を返す。
     *
     * 通常はtemplateそのものかrawプロパティを返す。
     */
    prepareTemplate?: (
      this: CONTEXT,
      template: TemplateStringsArray,
    ) => readonly string[];
    /**
     *
     * @param this  {CONTEXT} initializeContextで生成されたインスタンス。
     * @param string 元のテンプレート文字列
     * @param index テンプレート文字列のインデックス
     * @param template 元のテンプレート文字列の配列
     * @returns
     */
    modifyTemplate?: (
      this: CONTEXT,
      string: string,
      index: number,
      template: readonly string[],
    ) => string;
    /**
     * 値をテンプレート文字列の間に挿入する文字列に変換する。
     *
     * convertValueが省略された場合、Stringが使用される。
     * @this {CONTEXT} initializeContextで生成されたインスタンス。
     * @param value タグ付きテンプレートに指定された値。
     * @returns テンプレート文字列の間に挿入する文字列。
     */
    convertValue?: (
      this: CONTEXT,
      value: PARAM,
      index: number,
      values: readonly PARAM[],
    ) => string;
    /**
     * テンプレート文字列と値を結合した文字列から最終的な返値を生成する。
     *
     * generateが省略された場合、sを返す関数が使用される。
     * @this {CONTEXT} initializeContextで生成されたインスタンス。
     * @param s テンプレート文字列と値を結合した文字列。
     * @returns このタグ付きテンプレートの最終的な返値。
     */
    generate?: (this: CONTEXT, s: string) => RETURN;
  } = {},
): (template: TemplateStringsArray, ...values: PARAM[]) => RETURN {
  const {
    initializeContext = () => undefined as CONTEXT,
    prepareTemplate: prepare = prepareTemplate,
    modifyTemplate = s => s,
    convertValue = String,
    generate = s => s as RETURN,
  } = methods;
  return function taggedTemplate(
    template: TemplateStringsArray,
    ...values: PARAM[]
  ): RETURN {
    try {
      // タグ付きテンプレートの呼び出しごとにコンテキストを生成する。
      const context = initializeContext(template, values);
      const string = ''.concat(
        ...(function* () {
          const templateArray = prepare.call(context, template);
          const valuesIterator = values[Symbol.iterator]();
          let index = 0;
          for (const e of templateArray) {
            yield modifyTemplate.call(context, e, index, templateArray);
            const {
              done,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- doneがfalseのときしかvalueにはアクセスしないのでanyにはならない
              value,
            } = valuesIterator.next();
            if (done) {
              break;
            }
            yield convertValue.call(context, value, index, values);
            ++index;
          }
        })(),
      );
      return generate.call(context, string);
    } catch (ex) {
      assert(ex instanceof Error);
      // スタックトレースから内部の呼び出しを除去
      Error.captureStackTrace(ex, taggedTemplate);
      throw ex;
    }
  };
}
