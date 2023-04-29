import { regexp } from '../src/regexp';

describe('regexp', () => {
  test('empty pattern', () => {
    expect(regexp/* regexp */ ``.source).toBe('(?:)');
  });
  test('simple pattern', () => {
    expect(regexp/* regexp */ `abc`.source).toBe('abc');
  });
  test('complex pattern', () => {
    expect(regexp/* regexp */ `[abc](\w+)\(\)\[\]`.source).toBe(
      '[abc](\\w+)\\(\\)\\[\\]',
    );
  });
  test('Strings are escaped', () => {
    const string = 'C:\\Program Files (x86)\\Common Files\\Microsoft';
    expect(regexp/* regexp */ `[abc](\w+)\(\)\[${string}\]`.source).toBe(
      '[abc](\\w+)\\(\\)\\[C:\\\\Program Files \\(x86\\)\\\\Common Files\\\\Microsoft\\]',
    );
  });
  test('Patterns are not escaped', () => {
    const pattern = /[a-z_][a-z_0-9]*/i;
    expect(regexp/* regexp */ `[abc](\w+)\(\)\[${pattern}\]`.source).toBe(
      '[abc](\\w+)\\(\\)\\[(?:[a-z_][a-z_0-9]*)\\]',
    );
  });
  test('Comments are removed', () => {
    expect(
      regexp/* regexp */ `
      // コメントは除去される
      [a-z_][a-z_0-9]*
      /**
       * ブロックコメントも
       */
      [-+](?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][-+][0-9]+)?
      // 英数字の間の連続した空白文字は一つの空白に置換
      abc
      def // 途中に1行コメントがあっても
      ghi /*
      ブロックコメントがあっても英数字の間なら空白文字は1つの空白に置換
      */ jkl 
      // 1行コメント
      /* ブロックコメント */
      // 1行コメント
      mno
      /* ブロックコメント */
      // 1行コメント
      /* ブロックコメント */
      pqr
      s/*
      英数字の間にコメントしかない場合は除去されるだけ
      */tu
      9vwx0
      yz
    `.source,
    ).toBe(
      '[a-z_][a-z_0-9]*[-+](?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][-+][0-9]+)?abc\\s+def\\s+ghi\\s+jkl\\s+mno\\s+pqr\\s+stu\\s+9vwx0\\s+yz',
    );
  });
  test('Escaped comments are not removed', () => {
    expect(
      regexp/* regexp */ `
      \// エスケープされたコメントは除去されない
      [a-z_][a-z_0-9]*
      /\*\*
       \* エスケープされたブロックコメントも
       \*/
      [-+](?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][-+][0-9]+)?
    `.source,
    ).toBe(
      '\\/\\/エスケープされたコメントは除去されない[a-z_][a-z_0-9]*\\/\\*\\*\\*エスケープされたブロックコメントも\\*\\/[-+](?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][-+][0-9]+)?',
    );
  });
  test('Consecutive spaces and tabs are replaced by a single space.', () => {
    expect(
      regexp/* regexp */ `
      abc def ghi      jkl   mno   pqr stu vwx yz
    `.source,
    ).toBe('abc\\s+def\\s+ghi\\s+jkl\\s+mno\\s+pqr\\s+stu\\s+vwx\\s+yz');
  });
  test('insert string and regexp', () => {
    const literal = '[]{}()';
    const pattern = /[a-z]/;
    expect(
      regexp/* regexp */ `
      ${literal}
      ${pattern}
      ${{ flags: 'i' }}
    `.source,
    ).toBe('\\[\\]\\{\\}\\(\\)(?:[a-z])');
  });
  test('flags specified', () => {
    expect(regexp`${/(?:)/s}`.flags).toBe('s');
    expect(regexp`${{ flags: 's' }}`.flags).toBe('s');
  });
});
describe('regexp.sub', () => {
  test('returns object, not RegExp', () => {
    expect(regexp.sub`abc`).toEqual({ source: 'abc', flags: '' });
    expect(regexp.sub`abc`).not.toEqual(RegExp);
  });
});
