import type { TaggedTemplate } from './TaggedTemplate';
import { unescape, addSafeUser } from './unescape';

function prepare(unescapeFunc?: (s: string) => string): TaggedTemplate {
  const template = unescapeFunc
    ? (template: TemplateStringsArray) => template.raw.map(unescapeFunc)
    : (template: TemplateStringsArray) => template.raw;
  return function basic(...args): string {
    return args[0].length === 0
      ? ''
      : template(args[0]).reduce((r, e, i) => r.concat(args[i], e));
  };
}

/**
 * 通常のテンプレートリテラルと同じ文字列を生成するタグ付きテンプレート。
 *
 * テンプレート文字列中のエスケープシーケンスが正しくない場合には例外を投げる。
 */
export const basic: TaggedTemplate & {
  /**
   * String.rawと同じくエスケープシーケンスを処理しないタグ付きテンプレート。
   */
  readonly raw: TaggedTemplate;
  /**
   * 通常のテンプレートリテラルとほぼ同じ文字列を生成するタグ付きテンプレート。
   *
   * テンプレート文字列中のエスケープシーケンスが正しくない場合には例外を投げずに`\`を取り除く。
   */
  readonly safe: TaggedTemplate;
} = Object.freeze(
  Object.assign(prepare(unescape), {
    raw: prepare(),
    safe: addSafeUser(prepare(unescape.safe)),
  }),
);
