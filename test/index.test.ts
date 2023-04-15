import { error, indented, regexp } from '../src/';

describe('import', () => {
  test('error', () => {
    expect(
      () => error`
    `,
    ).toThrow();
  });
  test('indented', () => {
    expect(indented`
    `).toBe('');
  });
  test(`regexp`, () => {
    expect(regexp`[a]`.source).toBe('[a]');
  });
});
