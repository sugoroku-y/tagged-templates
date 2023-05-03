import { basic } from '../src/basic';
import './toCallConsoleWarnWith';

describe('basic', () => {
  test('simple', () => {
    expect(basic`abc`).toBe('abc');
  });
  test('value inserted', () => {
    expect(basic`abc${'def'}ghi`).toBe('abcdefghi');
  });
  test('escape sequence', () => {
    expect(basic`\xabc ${'def'}\tghi\n`).toBe('\xabc def\tghi\n');
  });
  test('invalid escape sequence', () => {
    expect(() => basic`\xabc ${'def'}\8ghi\n`).toThrow(
      /^\\8 and \\9 are not allowed in indented tagged templates\.\n\\8ghi\\n\n\^\^$/,
    );
  });
});

describe('basic.raw', () => {
  test('simple', () => {
    expect(basic.raw`abc`).toBe('abc');
  });
  test('value inserted', () => {
    expect(basic.raw`abc${'def'}ghi`).toBe('abcdefghi');
  });
  test('escape sequence', () => {
    expect(basic.raw`\xabc ${'def'}\tghi\n`).toBe(String.raw`\xabc def\tghi\n`);
  });
  test('invalid escape sequence', () => {
    expect(basic.raw`\xabc ${'def'}\8ghi\n`).toBe(String.raw`\xabc def\8ghi\n`);
  });
  test('freeze', () => {
    expect(() => {
      basic.raw = () => __filename;
    }).toThrow();
  });
});

describe('basic.safe', () => {
  test('simple', () => {
    expect(basic.safe`abc`).toBe('abc');
  });
  test('value inserted', () => {
    expect(basic.safe`abc${'def'}ghi`).toBe('abcdefghi');
  });
  test('escape sequence', () => {
    expect(basic.safe`\xabc ${'def'}\tghi\n`).toBe(`\xabc def\tghi\n`);
  });
  test('invalid escape sequence', () => {
    expect(() => {
      expect(basic.safe`\xabc ${'def'}\8ghi\n`).toBe(`\xabc def8ghi\n`);
    }).toCallConsoleWarnWith(
      /^\\8 and \\9 are not allowed in indented tagged templates\.\n\\8ghi\\n\n\^\^\n {4}at /,
    );
  });
  test('freeze', () => {
    expect(() => {
      basic.safe = () => __filename;
    }).toThrow();
  });
});
