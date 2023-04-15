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
            // 8進数のエスケープ文字はタグ付きテンプレートではコンパイルエラーにならない(rawを使わない場合、実行時エラーになるだけ)
            '' // 一つ目の${～}より前に不正なUnicodeエスケープ文字があるとTypeScriptでエラーになってしまう
          }\u{1f38f}\u{110000}\xXX\uXXXXX
          `,
    ).toThrow(/^00123456789\n🎏u\{110000\}xXXuXXXXX$/);
  });
  test('error.for', () => {
    expect(
      () => error.for(SyntaxError)`
    `,
    ).toThrow(SyntaxError);
  });
});
