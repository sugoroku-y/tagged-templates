import assert from 'assert';
import { taggedTemplateBase } from './taggedTemplateBase';
import { unescape, addSafeUser } from './unescape';

/**
 * 通常のテンプレートリテラルと同じ文字列を生成するタグ付きテンプレート。
 *
 * テンプレート文字列中のエスケープシーケンスが正しくない場合には例外を投げる。
 */
export function basic(
  this: void,
  template: TemplateStringsArray,
  ...values: unknown[]
): string {
  try {
    return taggedTemplateBase(template.raw.map(unescape), values);
  } catch (ex) {
    assert(ex instanceof Error);
    // スタックトレースから内部の呼び出しを除去
    Error.captureStackTrace(ex, basic);
    throw ex;
  }
}

/**
 * String.rawと同じくエスケープシーケンスを処理しないタグ付きテンプレート。
 */
basic.raw = function basicRaw(
  this: void,
  template: TemplateStringsArray,
  ...values: unknown[]
): string {
  return taggedTemplateBase(template.raw, values);
};

/**
 * 通常のテンプレートリテラルとほぼ同じ文字列を生成するタグ付きテンプレート。
 *
 * テンプレート文字列中のエスケープシーケンスが正しくない場合には例外を投げずに`\`を取り除く。
 */
basic.safe = addSafeUser(function basicSafe(
  this: void,
  template: TemplateStringsArray,
  ...values: unknown[]
): string {
  return taggedTemplateBase(template.raw.map(unescape.safe), values);
});

Object.freeze(basic);
