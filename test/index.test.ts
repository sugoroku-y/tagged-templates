import { basic, error, indented, regexp } from '../src/';

describe('import', () => {
  test('basic', () => {
    expect(basic``).toBe('');
    expect(basic`a${'b'}c`).toBe('abc');
    expect(basic.raw``).toBe('');
    expect(basic.raw`\a\b\c${''}`).toBe('\\a\\b\\c');
    expect(basic.safe``).toBe('');
    expect(basic.safe`\a\b\c\8${''}`).toBe('a\bc8');
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
    expect(
      () => error`
      a
      ${'b'}
      c
   x   `,
    ).toThrow(/^\n {6}a\n {6}b\n {6}c\n {3}x {3}$/);
  });
  test('indented', () => {
    expect(indented`
    `).toBe('');
  });
  test(`regexp`, () => {
    expect(regexp`[a]`.source).toBe('[a]');
  });
});
