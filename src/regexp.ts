import { TaggedTemplate, taggedTemplateBase } from './taggedTemplateBase';

type AllCombinations<
  STR extends string,
  PRE extends string = '',
> = STR extends `${infer FIRST}${infer POST}`
  ?
      | `${FIRST}${AllCombinations<`${PRE}${POST}`>}`
      | AllCombinations<POST, `${PRE}${FIRST}`>
  : '';

// 正規表現のフラグに指定できる文字列
type RegExpFlags = AllCombinations<'dgimsuy'>;

type RegExpLike = {
  source: string;
  flags: RegExpFlags;
};

/** 各プロパティは省略可能だがいずれか一つは必須、にする型関数 */
type PartialButRequiredAtLeastOne<T> = {
  [K in keyof T]: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[keyof T];

/**
 * regexpタグ付きテンプレート内で使用できる値の型
 * - `string` 文字列値は正規表現の特殊文字をエスケープして挿入
 * - `number` 数値も文字列に変換してからエスケープして挿入
 * - `PartialButRequiredAtLeastOne<RegExpLike>`
 *   - `source`プロパティが文字列型であるオブジェクトはその`source`プロパティを`(?:～)`で囲って挿入
 *   - `flags`プロパティが文字列型であるオブジェクトはその`flags`プロパティをマージしたものをフラグとして使用する。
 *   - 両方あってもいいがどちらかは必須
 * - `RegExp` もちろん正規表現もOK
 */
type RegExpTemplateParam =
  | string
  | number
  | PartialButRequiredAtLeastOne<RegExpLike>
  | RegExp;

/**
 *
 * @param generate
 * @returns
 */
function regexpTaggedTemplateBase<RETURN>(
  generate: (source: string, flags: RegExpFlags) => RETURN,
): TaggedTemplate<RegExpTemplateParam, RETURN> {
  return taggedTemplateBase(() => {
    let flags: RegExpFlags = '';
    return {
      withoutUnescaping: true,
      modifyTemplate(s) {
        return (
          // - エスケープされた文字は残す
          //   `\/\/ aaaaaa`
          //   -> '\\/\\/ aaaaaa'
          // - コメントは除去
          //   `// aaaaaa` -> 除去
          //   `/* aaaaaa */` -> 除去
          // - 英数字の間の連続した空白とタブは1文字以上の空白文字(`\s+`)に置換
          //   `aaa    bbb` -> 'aaa\s+bbb'
          // - その他の空白とタブは除去
          //   `aaa  \n  ` -> 'aaa'
          // - ${~}部分については実際に挿入される値が英数字かどうかにかかわらず、何もないものと見なされる
          //   つまり${~}の直前や直後に空白があれば除去
          s.replace(
            /(\\)[\s\S]|(?<=(\w)?)(?:\/\/.*|\/\*[\s\S]*?\*\/|\s+)+(?=(\w)?)/g,
            (
              /** マッチした文字列 */
              match,
              /** エスケープシーケンスかどうか */
              escaped: string | undefined,
              /** マッチしたところの直前に英数字があるかどうか */
              pre: string | undefined,
              /** マッチしたところの直後に英数字があるかどうか */
              post: string | undefined,
            ) =>
              escaped
                ? // エスケープされていればそのまま
                  match
                : pre && post && match.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
                ? // 前後に英数字があって、コメント除去しても空文字列でない=連続した空白文字があったら1文字以上の空白文字に
                  '\\s+'
                : // その他は削除
                  '',
          )
        );
      },
      convertValue(value) {
        if (typeof value === 'string' || typeof value === 'number') {
          // 文字列が指定されたら正規表現の特殊文字をエスケープして挿入。
          return String(value).replace(/[[\](){}.?+*|^$\\]/g, '\\$&');
        }
        if (typeof value.flags === 'string') {
          // フラグが指定されていればマージ
          for (const flag of value.flags) {
            if (!flags.includes(flag)) {
              // flagsにないものだけを追加
              flags += flag;
            }
          }
        }
        return typeof value.source === 'string'
          ? // 正規表現はそのパターンをそのまま、ただし前後に影響が出ないように`(?:～)`で囲んで挿入
            `(?:${value.source})`
          : // 上記以外は除去
            '';
      },
      generate: source => generate(source, flags),
    };
  });
}

/**
 * 正規表現を生成するタグ付きテンプレート
 *
 * @param {TemplateStringsArray} template テンプレート文字列
 *
 * 正規表現ではエスケープシーケンスが多用されるため`raw`プロパティが使用される。
 *
 * テンプレート文字列は以下のように修正されて使用される。
 *
 * - 1行コメント、ブロックコメントは除去する。
 * - 改行、空白、タブは除去する。
 *   - ただし、前後に英数字がある場合は`\s+`に置き換える。
 * - エスケープされている場合(`\/*`や`\ `など)は上記の対象外
 * @param {RegExpTemplateParam} values テンプレートに挿入される値
 * - 文字列値が正規表現の特殊文字を含んでいる場合、エスケープしてから挿入。
 * - 数値も文字列に変換したあと、エスケープして挿入。
 * - `source`プロパティが文字列値であるオブジェクトは、その`source`プロパティを`(?:～)`で囲って挿入。
 * - `flags`プロパティが文字列値であるオブジェクトは、そのすべての`flags`プロパティをマージしたものを生成するRegExpに指定。
 * - 上記以外は無視。
 * @returns {RegExp} テンプレート文字列と挿入される値から生成したパターンとフラグを指定して生成された正規表現を返す。
 */
export const regexp = Object.freeze(
  Object.assign(
    regexpTaggedTemplateBase((source, flags) => new RegExp(source, flags)),
    {
      /**
       * {@link regexp}と同じ書式で、返値がRegExpではなく`source`プロパティと`flags`プロパティを持つオブジェクトを返す。
       *
       * `source`を正規表現として解釈しないので、{@link regexp}の挿入値としての正規表現パターンを生成するときに利用する。
       */
      sub: regexpTaggedTemplateBase((source, flags) => ({ source, flags })),
    },
  ),
);
