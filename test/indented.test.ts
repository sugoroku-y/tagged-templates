import { indented } from '../src/indented';

describe('indented', () => {
  test('empty', () => {
    expect(indented`
    `).toBe('');
  });
  test('single', () => {
    expect(indented`
    single
    `).toBe('single');
  });
  test('multi', () => {
    expect(indented`
    multi1
    multi2
    `).toBe('multi1\nmulti2');
  });
  test('multi with blank line', () => {
    expect(indented`
    multi1

    multi2
    `).toBe('multi1\n\nmulti2');
  });
  test('no indent', () => {
    expect(indented`
multi1

multi2
`).toBe('multi1\n\nmulti2');
  });
  test('multi with parameters', () => {
    expect(indented`
    multi1${undefined}  A
    multi2${{}}  B
    `).toBe('multi1undefined  A\nmulti2[object Object]  B');
  });
  test('empty template', () => {
    expect(() => indented``).toThrow(
      /^There must be a newline character immediately following the leading `\.$/,
    );
  });
  test('The first character is not LF', () => {
    expect(
      () => indented`a
    `,
    ).toThrow(
      /^There must be a newline character immediately following the leading `\.$/,
    );
  });
  test('first template is empty', () => {
    expect(
      () => indented`${''}
    `,
    ).toThrow(
      /^There must be a newline character immediately following the leading `\.$/,
    );
  });
  test('The template is empty', () => {
    expect(() => indented``).toThrow(
      /^There must be a newline character immediately following the leading `\.$/,
    );
  });
  test('The template is call as function', () => {
    const template = Object.assign([], { raw: [] });
    // タグ付きテンプレートの第1引数が空になることはないので無理矢理、空の配列を指定して呼び出し
    expect(() => indented(template)).toThrow(/^Call as a tagged template\.$/);
  });
  test('The last template is empty', () => {
    expect(() => indented`${''}`).toThrow(
      /^There must be a newline character immediately following the leading `\.$/,
    );
  });
  test('The last template does not include LF', () => {
    expect(
      () => indented`
    ${''}    `,
    ).toThrow(
      /^There must be no non-whitespace or non-tab characters between the trailing end ` and the beginning of the line\.$/,
    );
  });
  test('The last line is not just spaces and tabs', () => {
    expect(
      () => indented`
      a`,
    ).toThrow(
      /^There must be no non-whitespace or non-tab characters between the trailing end ` and the beginning of the line\.$/,
    );
  });
  test('Indentation is uneven', () => {
    expect(
      () => indented`
    A
  B
    `,
    ).toThrow(
      /^Each line must be blank or begin with the indent at the beginning of the line\.$/,
    );
  });
  test('Indentation is uneven with insert', () => {
    expect(
      () => indented`
    A
${''}
    `,
    ).toThrow(
      /^Each line must be blank or begin with the indent at the beginning of the line\.$/,
    );
  });
  test('escaped', () => {
    expect(indented`
    ${'abc'}\
    abc\b\f\n\r\t\v\x22\u{5c}\u3042\u{1f38f}\0\🎏\\
    `).toBe('abcabc\b\f\n\r\t\v\x22\u{5c}あ🎏\x00🎏\\');
  });
  test('escaped error: unicode', () => {
    expect(
      () =>
        indented`
          ${''}abc \uXXXX
          aaaaaa
          `,
    ).toThrow(/^Invalid Unicode escape sequence\nabc \\uXXXX\n {4}\^{2}$/);
  });
  test('escaped error: Unicode: short', () => {
    expect(
      () =>
        indented`
          ${''}abc \uAAA
          aaaaaa
          `,
    ).toThrow(/^Invalid Unicode escape sequence\nabc \\uAAA\n {4}\^{2}$/);
  });
  test('escaped error: invalid Unicode', () => {
    expect(
      () =>
        indented`
          ${''}abc \uAAAX
          aaaaaa
          `,
    ).toThrow(/^Invalid Unicode escape sequence\nabc \\uAAAX\n {4}\^{2}$/);
  });
  test('escaped error: unicode: braced', () => {
    expect(
      () =>
        indented`
          ${''}abc \u{XXXX}
          aaaaaa
          `,
    ).toThrow(/^Invalid Unicode escape sequence\nabc \\u{XXXX}\n {4}\^{2}$/);
  });
  test('escaped error: unicode: unmatch brace', () => {
    expect(
      () =>
        indented`
          ${''}abc \u{XXXX
          aaaaaa
          `,
    ).toThrow(/^Invalid Unicode escape sequence\nabc \\u{XXXX\n {4}\^{2}$/);
  });
  test('escaped error: unicode: empty in brace', () => {
    expect(
      () =>
        indented`
          ${''}abc \u{}
          aaaaaa
          `,
    ).toThrow(/^Invalid Unicode escape sequence\nabc \\u{}\n {4}\^{2}$/);
  });
  test('escaped error: unicode: exceeded', () => {
    expect(
      () =>
        indented`
          ${''}abc \u{11ffff}
          aaaaaa
          `,
    ).toThrow(/^Undefined Unicode code-point\nabc \\u{11ffff}\n {4}\^{10}$/);
  });
  test('escaped error: hexadecimal', () => {
    expect(
      () =>
        indented`
          ${''}abc \xXX
          `,
    ).toThrow(/^Invalid hexadecimal escape sequence\nabc \\xXX\n {4}\^{2}$/);
  });
  test('escaped error: short hexadecimal', () => {
    expect(
      () =>
        indented`
          ${''}abc \xA
          `,
    ).toThrow(/^Invalid hexadecimal escape sequence\nabc \\xA\n {4}\^{2}$/);
  });
  test('escaped error: invalid hexadecimal', () => {
    expect(
      () =>
        indented`
          ${''}abc \xAX
          `,
    ).toThrow(/^Invalid hexadecimal escape sequence\nabc \\xAX\n {4}\^{2}$/);
  });
  test('escaped error: octet escape sequence: \\00', () => {
    expect(
      () =>
        indented`
          ${''}\00
          `,
    ).toThrow(
      /^Octal escape sequences are not allowed in indented tagged templates\.\n\\00\n\^{3}$/,
    );
  });
  test('escaped error: octet escape sequence: \\09', () => {
    expect(
      () =>
        indented`
          ${''}\09
          `,
    ).toThrow(
      /^Octal escape sequences are not allowed in indented tagged templates\.\n\\09\n\^{3}$/,
    );
  });
  test('escaped error: octet escape sequence: \\1', () => {
    expect(
      () =>
        indented`
          ${''}\1
          `,
    ).toThrow(
      /^Octal escape sequences are not allowed in indented tagged templates\.\n\\1\n\^{2}$/,
    );
  });
  test('escaped error: octet escape sequence: \\7', () => {
    expect(
      () =>
        indented`
          ${''}\7
          `,
    ).toThrow(
      /^Octal escape sequences are not allowed in indented tagged templates\.\n\\7\n\^{2}$/,
    );
  });
  test('escaped error: octet escape sequence: \\8', () => {
    expect(
      () =>
        indented`
          ${''}\8
          `,
    ).toThrow(
      /^\\8 and \\9 are not allowed in indented tagged templates\.\n\\8\n\^{2}$/,
    );
  });
  test('escaped error: octet escape sequence: \\9', () => {
    expect(
      () =>
        indented`
          ${''}\9
          `,
    ).toThrow(
      /^\\8 and \\9 are not allowed in indented tagged templates\.\n\\9\n\^{2}$/,
    );
  });
  test('indented freezed', () => {
    expect(() => {
      // @ts-expect-error JavaScriptでもエラーになることを確認する
      indented.raw = () => __filename;
    }).toThrow();
  });
});
describe('indented.safe', () => {
  test('empty template', () => {
    expect(indented.safe``).toBe('');
  });
  test('The first character is not LF', () => {
    expect(indented.safe`a
    `).toBe('a\n    ');
  });
  test('first template is empty', () => {
    expect(indented.safe`${''}
    `).toBe('\n    ');
  });
  test('The template is empty', () => {
    expect(indented.safe``).toBe('');
  });
  test('The template is call as function', () => {
    const template = Object.assign([], { raw: [] });
    // タグ付きテンプレートの第1引数が空になることはないので無理矢理、空の配列を指定して呼び出し
    expect(indented.safe(template)).toBe('');
  });
  test('The last template is empty', () => {
    expect(indented.safe`${''}`).toBe('');
  });
  test('The last template does not include LF', () => {
    expect(indented.safe`
    ${''}    `).toBe('\n        ');
  });
  test('The last line is not just spaces and tabs', () => {
    expect(indented.safe`
      a`).toBe('\n      a');
  });
  test('Indentation is uneven', () => {
    expect(indented.safe`
    A
  B
    `).toBe('\n    A\n  B\n    ');
  });
  test('Indentation is uneven with insert', () => {
    expect(indented.safe`
    A
${''}
    `).toBe('\n    A\n\n    ');
  });
  test('escaped error: unicode', () => {
    expect(indented.safe`
          ${''}abc \uXXXX
          aaaaaa
          `).toBe('abc uXXXX\naaaaaa');
  });
  test('escaped error: Unicode: short', () => {
    expect(indented.safe`
          ${''}abc \uAAA
          aaaaaa
          `).toBe('abc uAAA\naaaaaa');
  });
  test('escaped error: invalid Unicode', () => {
    expect(indented.safe`
          ${''}abc \uAAAX
          aaaaaa
          `).toBe('abc uAAAX\naaaaaa');
  });
  test('escaped error: unicode: braced', () => {
    expect(indented.safe`
          ${''}abc \u{XXXX}
          aaaaaa
          `).toBe('abc u{XXXX}\naaaaaa');
  });
  test('escaped error: unicode: unmatch brace', () => {
    expect(indented.safe`
          ${''}abc \u{XXXX
          aaaaaa
          `).toBe('abc u{XXXX\naaaaaa');
  });
  test('escaped error: unicode: empty in brace', () => {
    expect(indented.safe`
          ${''}abc \u{}
          aaaaaa
          `).toBe('abc u{}\naaaaaa');
  });
  test('escaped error: unicode: exceeded', () => {
    expect(indented.safe`
          ${''}abc \u{11ffff}
          aaaaaa
          `).toBe('abc u{11ffff}\naaaaaa');
  });
  test('escaped error: hexadecimal', () => {
    expect(indented.safe`
          ${''}abc \xXX
          `).toBe('abc xXX');
  });
  test('escaped error: short hexadecimal', () => {
    expect(indented.safe`
          ${''}abc \xA
          `).toBe('abc xA');
  });
  test('escaped error: invalid hexadecimal', () => {
    expect(indented.safe`
          ${''}abc \xAX
          `).toBe('abc xAX');
  });
  test('escaped error: octet escape sequence: \\00', () => {
    expect(indented.safe`
          ${''}\00
          `).toBe('00');
  });
  test('escaped error: octet escape sequence: \\09', () => {
    expect(indented.safe`
          ${''}\09
          `).toBe('09');
  });
  test('escaped error: octet escape sequence: \\1', () => {
    expect(indented.safe`
          ${''}\1
          `).toBe('1');
  });
  test('escaped error: octet escape sequence: \\7', () => {
    expect(indented.safe`
          ${''}\7
          `).toBe('7');
  });
  test('escaped error: octet escape sequence: \\8', () => {
    expect(indented.safe`
          ${''}\8
          `).toBe('8');
  });
  test('escaped error: octet escape sequence: \\9', () => {
    expect(
      indented.safe`
          ${''}\9
          `,
    ).toBe('9');
  });
  test('indented freezed', () => {
    expect(() => {
      // @ts-expect-error JavaScriptでもエラーになることを確認する
      indented.safe = () => __filename;
    }).toThrow();
  });
});

describe('indented.raw', () => {
  test('unescaped backslash at end of line', () => {
    expect(indented.raw`
    ${'abc'}\
    abc
    `).toBe('abc\\\nabc');
  });
});

describe('sample code', () => {
  function xxx() {
    const text = indented`
        aaaaaa\
        bbbbbb

        cccccc
        `; // -> 'aaaaaabbbbbb\n\ncccccc'
    return text;
  }

  function xxxRaw() {
    const text = indented.raw`
        aaaaaa\
        bbbbbb

        cccccc
        `; // -> 'aaaaaa\\\nbbbbbb\n\ncccccc'
    return text;
  }
  function xxxSafe() {
    const text = indented.safe`
        aaaaaa ${''}\uXXXX
        bbbbbb

        cccccc
        `; // -> 'aaaaaa uXXXX\nbbbbbb\n\ncccccc'
    return text;
  }

  test('indented', () => {
    expect(xxx()).toBe('aaaaaabbbbbb\n\ncccccc');
  });
  test('indented.raw', () => {
    expect(xxxRaw()).toBe('aaaaaa\\\nbbbbbb\n\ncccccc');
  });
  test('indented.safe', () => {
    expect(xxxSafe()).toBe('aaaaaa uXXXX\nbbbbbb\n\ncccccc');
  });
});
