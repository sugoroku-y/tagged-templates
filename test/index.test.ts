import { basic, error, indented, regexp } from '../src/';
import './toCallConsoleWarnWith';

describe('import', () => {
  test('basic', () => {
    expect(basic``).toBe('');
    expect(basic`a${'b'}c`).toBe('abc');
    expect(basic.raw``).toBe('');
    expect(basic.raw`\a\b\c${''}`).toBe('\\a\\b\\c');
    expect(basic.safe``).toBe('');
    expect(() => {
      expect(basic.safe`\a\b\c\8${''}`).toBe('a\bc8');
    }).toCallConsoleWarnWith(
      /^\\8 and \\9 are not allowed in indented tagged templates\.\n\\a\\b\\c\\8\n {6}\^\^\n {4}at /,
    );
  });
  test('error', () => {
    expect(() => error``).toThrow(/^$/);
    expect(() => error`a${'b'}c`).toThrow(/^abc$/);
    expect(
      () => error`
      a
      ${'b'}
      c
      `,
    ).toThrow(/^a\nb\nc$/);
    expect(() => {
      expect(
        () => error`
        a
        ${'b'}
        c
     x   `,
      ).toThrow(/^\n {8}a\n {8}b\n {8}c\n {5}x {3}$/);
    }).toCallConsoleWarnWith(
      /^There must be no non-whitespace or non-tab characters between the trailing end ` and the beginning of the line\.\n {4}at /,
    );
  });
  test('indented', () => {
    expect(indented`
    `).toBe('');
  });
  test(`regexp`, () => {
    expect(regexp`[a]`.source).toBe('[a]');
  });
});
