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
    expect(() => indented``).toThrow('The beginning must be a newline.');
  });
  test('The first character is not LF', () => {
    expect(
      () => indented`a
    `,
    ).toThrow('The beginning must be a newline.');
  });
  test('first template is empty', () => {
    expect(
      () => indented`${''}
    `,
    ).toThrow('The beginning must be a newline.');
  });
  test('The template is empty', () => {
    expect(() => indented``).toThrow('The beginning must be a newline.');
  });
  test('The template is call as function', () => {
    const template = Object.assign([], { raw: [] });
    // タグ付きテンプレートの第1引数が空になることはないので無理矢理、空の配列を指定して呼び出し
    expect(() => indented(template)).toThrow('Call as a tagged template.');
  });
  test('The last template is empty', () => {
    expect(() => indented`${''}`).toThrow('The beginning must be a newline.');
  });
  test('The last template does not include LF', () => {
    expect(
      () => indented`
    ${''}    `,
    ).toThrow(
      'The end must be spaces or tabs only from the beginning of the line.',
    );
  });
  test('The last line is not just spaces and tabs', () => {
    expect(
      () => indented`
      a`,
    ).toThrow(
      'The end must be spaces or tabs only from the beginning of the line.',
    );
  });
  test('Indentation is uneven', () => {
    expect(
      () => indented`
    A
  B
    `,
    ).toThrow('Indentation is not aligned.');
  });
  test('Indentation is uneven with insert', () => {
    expect(
      () => indented`
    A
${''}
    `,
    ).toThrow('Indentation is not aligned.');
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
      indented.raw = () => __filename;
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
