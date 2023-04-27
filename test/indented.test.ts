import { indented } from '../src/indented';
import './toCallConsoleWarnWith';

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
    expect(() => {
      expect(indented.safe``).toBe('');
    }).toCallConsoleWarnWith(
      /^There must be a newline character immediately following the leading `\.\n {4}at /,
    );
  });
  test('The first character is not LF', () => {
    expect(() => {
      expect(indented.safe`a
    `).toBe('a\n    ');
    }).toCallConsoleWarnWith(
      /^There must be a newline character immediately following the leading `\.\n {4}at /,
    );
  });
  test('first template is empty', () => {
    expect(() => {
      expect(indented.safe`${''}
    `).toBe('\n    ');
    }).toCallConsoleWarnWith(
      /^There must be a newline character immediately following the leading `\.\n {4}at /,
    );
  });
  test('The template is empty', () => {
    expect(() => {
      expect(indented.safe``).toBe('');
    }).toCallConsoleWarnWith(
      /^There must be a newline character immediately following the leading `\.\n {4}at /,
    );
  });
  test('The template is call as function', () => {
    expect(() => {
      const template = Object.assign([], { raw: [] });
      // タグ付きテンプレートの第1引数が空になることはないので無理矢理、空の配列を指定して呼び出し
      expect(indented.safe(template)).toBe('');
    }).toCallConsoleWarnWith(/^Call as a tagged template\.\n {4}at /);
  });
  test('The last template is empty', () => {
    expect(() => {
      expect(indented.safe`${''}`).toBe('');
    }).toCallConsoleWarnWith(
      /^There must be a newline character immediately following the leading `\.\n {4}at /,
    );
  });
  test('The last template does not include LF', () => {
    expect(() => {
      expect(indented.safe`
    ${''}    `).toBe('\n        ');
    }).toCallConsoleWarnWith(
      /^There must be no non-whitespace or non-tab characters between the trailing end ` and the beginning of the line\.\n {4}at /,
    );
  });
  test('The last line is not just spaces and tabs', () => {
    expect(() => {
      expect(indented.safe`
      a`).toBe('\n      a');
    }).toCallConsoleWarnWith(
      /^There must be no non-whitespace or non-tab characters between the trailing end ` and the beginning of the line\.\n {4}at /,
    );
  });
  test('Indentation is uneven', () => {
    expect(() => {
      expect(indented.safe`
    A
  B
    `).toBe('\n    A\n  B\n    ');
    }).toCallConsoleWarnWith(
      /^Each line must be blank or begin with the indent at the beginning of the line\.\n {4}at /,
    );
  });
  test('Indentation is uneven with insert', () => {
    expect(() => {
      expect(indented.safe`
    A
${''}
    `).toBe('\n    A\n\n    ');
    }).toCallConsoleWarnWith(
      /^Each line must be blank or begin with the indent at the beginning of the line\.\n {4}at /,
    );
  });
  test('escaped error: unicode', () => {
    expect(() => {
      expect(indented.safe`
          ${''}abc \uXXXX
          aaaaaa
          `).toBe('abc uXXXX\naaaaaa');
    }).toCallConsoleWarnWith(
      /^Invalid Unicode escape sequence\nabc \\uXXXX\n {4}\^{2}\n {4}at /,
    );
  });
  test('escaped error: Unicode: short', () => {
    expect(() => {
      expect(indented.safe`
          ${''}abc \uAAA
          aaaaaa
          `).toBe('abc uAAA\naaaaaa');
    }).toCallConsoleWarnWith(
      /^Invalid Unicode escape sequence\nabc \\uAAA\n {4}\^{2}\n {4}at /,
    );
  });
  test('escaped error: invalid Unicode', () => {
    expect(() => {
      expect(indented.safe`
          ${''}abc \uAAAX
          aaaaaa
          `).toBe('abc uAAAX\naaaaaa');
    }).toCallConsoleWarnWith(
      /^Invalid Unicode escape sequence\nabc \\uAAAX\n {4}\^{2}\n {4}at /,
    );
  });
  test('escaped error: unicode: braced', () => {
    expect(() => {
      expect(indented.safe`
          ${''}abc \u{XXXX}
          aaaaaa
          `).toBe('abc u{XXXX}\naaaaaa');
    }).toCallConsoleWarnWith(
      /^Invalid Unicode escape sequence\nabc \\u\{XXXX\}\n {4}\^{2}\n {4}at /,
    );
  });
  test('escaped error: unicode: unmatch brace', () => {
    expect(() => {
      expect(indented.safe`
          ${''}abc \u{XXXX
          aaaaaa
          `).toBe('abc u{XXXX\naaaaaa');
    }).toCallConsoleWarnWith(
      /^Invalid Unicode escape sequence\nabc \\u\{XXXX\n {4}\^{2}\n {4}at /,
    );
  });
  test('escaped error: unicode: empty in brace', () => {
    expect(() => {
      expect(indented.safe`
          ${''}abc \u{}
          aaaaaa
          `).toBe('abc u{}\naaaaaa');
    }).toCallConsoleWarnWith(
      /^Invalid Unicode escape sequence\nabc \\u\{\}\n {4}\^{2}\n {4}at /,
    );
  });
  test('escaped error: unicode: exceeded', () => {
    expect(() => {
      expect(indented.safe`
          ${''}abc \u{11ffff}
          aaaaaa
          `).toBe('abc u{11ffff}\naaaaaa');
    }).toCallConsoleWarnWith(
      /^Undefined Unicode code-point\nabc \\u\{11ffff\}\n {4}\^{10}\n {4}at /,
    );
  });
  test('escaped error: hexadecimal', () => {
    expect(() => {
      expect(indented.safe`
          ${''}abc \xXX
          `).toBe('abc xXX');
    }).toCallConsoleWarnWith(
      /^Invalid hexadecimal escape sequence\nabc \\xXX\n {4}\^{2}\n {4}at /,
    );
  });
  test('escaped error: short hexadecimal', () => {
    expect(() => {
      expect(indented.safe`
          ${''}abc \xA
          `).toBe('abc xA');
    }).toCallConsoleWarnWith(
      /^Invalid hexadecimal escape sequence\nabc \\xA\n {4}\^{2}\n {4}at /,
    );
  });
  test('escaped error: invalid hexadecimal', () => {
    expect(() => {
      expect(indented.safe`
          ${''}abc \xAX
          `).toBe('abc xAX');
    }).toCallConsoleWarnWith(
      /^Invalid hexadecimal escape sequence\nabc \\xAX\n {4}\^{2}\n {4}at /,
    );
  });
  test('escaped error: octet escape sequence: \\00', () => {
    expect(() => {
      expect(indented.safe`
          ${''}\00
          `).toBe('00');
    }).toCallConsoleWarnWith(
      /^Octal escape sequences are not allowed in indented tagged templates\.\n\\00\n\^\^\^\n {4}at /,
    );
  });
  test('escaped error: octet escape sequence: \\09', () => {
    expect(() => {
      expect(indented.safe`
          ${''}\09
          `).toBe('09');
    }).toCallConsoleWarnWith(
      /^Octal escape sequences are not allowed in indented tagged templates\.\n\\09\n\^\^\^\n {4}at /,
    );
  });
  test('escaped error: octet escape sequence: \\1', () => {
    expect(() => {
      expect(indented.safe`
          ${''}\1
          `).toBe('1');
    }).toCallConsoleWarnWith(
      /^Octal escape sequences are not allowed in indented tagged templates\.\n\\1\n\^\^\n {4}at /,
    );
  });
  test('escaped error: octet escape sequence: \\7', () => {
    expect(() => {
      expect(indented.safe`
          ${''}\7
          `).toBe('7');
    }).toCallConsoleWarnWith(
      /^Octal escape sequences are not allowed in indented tagged templates\.\n\\7\n\^\^\n {4}at /,
    );
  });
  test('escaped error: octet escape sequence: \\8', () => {
    expect(() => {
      expect(indented.safe`
          ${''}\8
          `).toBe('8');
    }).toCallConsoleWarnWith(
      /^\\8 and \\9 are not allowed in indented tagged templates\.\n\\8\n\^\^\n {4}at /,
    );
  });
  test('escaped error: octet escape sequence: \\9', () => {
    expect(() => {
      expect(
        indented.safe`
          ${''}\9
          `,
      ).toBe('9');
    }).toCallConsoleWarnWith(
      /^\\8 and \\9 are not allowed in indented tagged templates\.\n\\9\n\^\^\n {4}at /,
    );
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
    expect(() => {
      expect(xxxSafe()).toBe('aaaaaa uXXXX\nbbbbbb\n\ncccccc');
    }).toCallConsoleWarnWith(
      /^Invalid Unicode escape sequence\n\\uXXXX\n\^{2}\n {4}at /,
    );
  });
});
