import { error } from '../src/error';

describe('error', () => {
  test('exec without parameters', () => {
    expect(
      () => error`
    `,
    ).toThrow(/^$/);
  });
  test('exec with message', () => {
    expect(
      () => error`
      message
      `,
    ).toThrow(/^message$/);
  });
  test('exec with message and number', () => {
    const number = 123;
    expect(
      () => error`
      message ${number}
      `,
    ).toThrow(/^message 123$/);
  });
  test('exec with invalid escape sequence', () => {
    expect(
      () =>
        error`
          \00\1\2\3\4\5\6\7\8\9\n${
            // 8進数のエスケープシーケンスはタグ付きテンプレートではコンパイルエラーにならない(rawを使わない場合、実行時エラーになるだけ)
            '' // 一つ目の${～}より前に不正なUnicodeエスケープシーケンスがあるとTypeScriptでエラーになってしまう
          }\u{1f38f}\u{110000}\xXX\uXXXXX
          `,
    ).toThrow(/^00123456789\n🎏u\{110000\}xXXuXXXXX$/);
  });
});
describe('error.as', () => {
  test('empty template', () => {
    expect(() => error.as(SyntaxError)`abc`).toThrow(SyntaxError);
    expect(() => error.as(SyntaxError)`abc`).toThrow(/^abc$/);
  });
  test('multiline', () => {
    expect(() => {
      const line = 'abc def ghi jkl mno pqr st\\u vwx yz';
      const col = 26;
      const mark = 2;
      error.as(SyntaxError)`
        Invalid Unicode escape sequence
        ${line}
        ${' '.repeat(col)}${'^'.repeat(mark)}
        `;
    }).toThrow(
      /^Invalid Unicode escape sequence\nabc def ghi jkl mno pqr st\\u vwx yz\n {26}\^{2}$/,
    );
    expect(
      () => error.as(SyntaxError)`
      `,
    ).toThrow(SyntaxError);
  });
  test('illegal tagged template call', () => {
    const template = Object.assign([], { raw: [] });
    expect(() => error.as(SyntaxError)(template)).toThrow(SyntaxError);
  });
  test('error freezed', () => {
    expect(() => {
      // @ts-expect-error JavaScriptでもエラーになることを確認する
      error.as = () => __filename;
    }).toThrow();
  });
});
