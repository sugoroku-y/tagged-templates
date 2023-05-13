import assert from 'assert';
import { unescape, captureStackTrace, addSafeUser } from './unescape';
import {
  TaggedTemplateContext,
  prepareTemplateRaw,
  taggedTemplateBase,
} from './taggedTemplateBase';

class IndentedFormatError extends Error {
  override name = 'IndentedFormatError';
}

abstract class IndentedContextBase implements TaggedTemplateContext {
  /**
   * インデント除去の際に検索する文字列。
   *
   * 改行文字+除去するインデント。
   */
  private readonly searchValue: string;
  /**
   * テンプレート文字列の書式チェックとともにインデントを取得する。
   *
   * @param {TemplateStringsArray} テンプレート文字列
   */
  constructor({ raw: template }: TemplateStringsArray) {
    // タグ付きテンプレートとして呼ばれたらtemplate.lengthは1以上になるはず
    if (template.length === 0) {
      throw new IndentedFormatError(`Call as a tagged template.`);
    }
    const firstTemplate = template[0];
    assert(firstTemplate !== undefined); // template.lengthが1以上なので、firstTemplateはundefinedではない
    if (firstTemplate.charAt(0) !== '\n') {
      // 先頭の`の直後には改行がなければならない
      throw new IndentedFormatError(
        'There must be a newline character immediately following the leading `.',
      );
    }
    const lastTemplate = template[template.length - 1];
    assert(lastTemplate !== undefined); // template.lengthが1以上なので、lastTemplateはundefinedではない
    // 末尾の`から行頭までにある空白/タブ
    const [indent] = /(?<=\n)[ \t]*$/.exec(lastTemplate) ?? [];
    if (indent === undefined) {
      // 末尾には行頭から空白もしくはタブのみでなければならない
      throw new IndentedFormatError(
        'There must be no non-whitespace or non-tab characters between the trailing end ` and the beginning of the line.',
      );
    }
    const illegalBeginningOfLine = new RegExp(`\n(?!\n|${indent})`);
    if (template.some(t => illegalBeginningOfLine.test(t))) {
      // 各行は空行であるか行頭が指定のインデントで始まっていなければならない。
      throw new IndentedFormatError(
        'Each line must be blank or begin with the indent at the beginning of the line.',
      );
    }
    this.searchValue = `\n${indent}`;
  }

  readonly prepareTemplate = prepareTemplateRaw;

  abstract modifyTemplate(
    s: string,
    index: number,
    template: readonly string[],
  ): string;

  /**
   * テンプレート文字列からインデントを除去する。
   *
   * @param {string} s 元のテンプレート文字列
   * @param {number} index テンプレート文字列のインデックス
   * @param {readonlystring[]} template テンプレート文字列の配列
   * @returns {string} 整形後のテンプレート文字列
   */
  protected unindent(
    s: string,
    index: number,
    template: readonly string[],
  ): string {
    // 改行の後のインデント(つまり行頭のインデント)を除去
    s = s.split(this.searchValue).join('\n');
    if (index === 0) {
      // 先頭の改行は除去
      s = s.slice(1);
    }
    if (index === template.length - 1) {
      // 末尾の改行も除去(末尾のインデントはsplit-joinで除去済み)
      s = s.slice(0, -1);
    }
    return s;
  }
}

class IndentedContext extends IndentedContextBase {
  override modifyTemplate(
    s: string,
    index: number,
    template: readonly string[],
  ): string {
    return unescape(this.unindent(s, index, template));
  }
}

class IndentedRawContext extends IndentedContextBase {
  override modifyTemplate(
    s: string,
    index: number,
    template: readonly string[],
  ): string {
    return this.unindent(s, index, template);
  }
}

class IndentedSafeContext extends IndentedContextBase {
  override modifyTemplate(
    s: string,
    index: number,
    template: readonly string[],
  ): string {
    return unescape.safe(this.unindent(s, index, template));
  }
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
export const indented = Object.freeze(
  Object.assign(
    taggedTemplateBase(template => new IndentedContext(template)),
    {
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
      raw: taggedTemplateBase(template => new IndentedRawContext(template)),
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
      safe: addSafeUser(
        taggedTemplateBase(template => {
          try {
            return new IndentedSafeContext(template);
          } catch (ex) {
            assert(ex instanceof Error);
            // エラーになった(書式が正しくない)ときはエラー内容をログに出して続行
            console.warn(`${ex.message}\n${captureStackTrace()}`);
            // エラーだったらbasic.safeと同じcontextを返す
            return {
              prepareTemplate: prepareTemplateRaw,
              modifyTemplate: unescape.safe,
            };
          }
        }),
      ),
    },
  ),
);
