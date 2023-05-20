import { taggedTemplateBase } from '../src/taggedTemplateBase';
import { unescape } from '../src/unescape';

describe('unescape.safe', () => {
  test('freeze', () => {
    expect(() => (unescape.safe = () => '')).toThrow();
  });
});

describe('taggedTemplateBase', () => {
  test('empty methods', () => {
    expect(taggedTemplateBase({})`abc${'def'}ghi`).toBe('abcdefghi');
  });
});
