import { error } from './error';

/**
 * エスケープ文字のうち、定数から定数への変換を行うもののマップ
 */
const UNESCAPE_MAP = {
  '\\b': '\b',
  '\\f': '\f',
  '\\n': '\n',
  '\\r': '\r',
  '\\t': '\t',
  '\\v': '\v',
  // 改行前に`\`があれば`\`ごと削除
  '\\\r': '',
  '\\\n': '',
  // 8進数のエスケープ文字の中でも`\0`だけは例外的に許可
  '\\0': '\0',
} as const;

/**
 * エスケープ文字を解除する。
 * @param onError 不適切なエスケープ文字があった場合のエラー処理
 * - 第1引数は発生したエラーのメッセージ。
 * - 第2引数はreplaceのコールバックに渡されるすべての引数。
 * @param s エスケープされた文字列
 * @returns エスケープを解除した文字列
 */
function unescape_implement(
  s: string,
  onError: (message: string, args: [string, ...unknown[]]) => string,
): string {
  return s.replace(
    /\\[\s\S](?:(?<=0)[0-9]|(?<=x)([0-9A-Fa-f]{2})|(?<=u)(?:\{([0-9A-Fa-f]{1,6})\}|([0-9A-Fa-f]{4})))?/g,
    (...args) => {
      const [match] = args;
      if (match in UNESCAPE_MAP) {
        // 定数から定数への変換
        return UNESCAPE_MAP[match as keyof typeof UNESCAPE_MAP];
      }
      const ch = match.charAt(1);
      switch (ch) {
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
          // 8進数文字コードのエスケープはテンプレートリテラルで禁止されているのでここでも禁止
          // ただし`\0`(その後に数字の続かないもの)だけはUNESCAPE_MAPで対応済みなのでここには来ない
          return onError(
            'Octal escape sequences are not allowed in indented tagged templates.',
            args,
          );
        case '8':
        case '9':
          // \8と\9も同様に禁止
          return onError(
            '\\8 and \\9 are not allowed in indented tagged templates.',
            args,
          );
        case 'u':
        case 'x': {
          // 16進数部分
          const hex: unknown = args[1] ?? args[2] ?? args[3];
          if (typeof hex !== 'string') {
            // 16進数部分が存在しない => 正しい形式ではなかった
            return onError(
              ch === 'u'
                ? 'Invalid Unicode escape sequence'
                : 'Invalid hexadecimal escape sequence',
              args,
            );
          }
          // 文字コード
          const code = parseInt(hex, 16);
          if (code > 0x10ffff) {
            // Unicodeの範囲外だった(-がパターンにないので負数は考えなくて良い)
            return onError('Undefined Unicode code-point', args);
          }
          // 文字コードから文字へ
          return String.fromCodePoint(code);
        }
        default:
          // 単なるエスケープはそのまま`\`だけ削除
          return match.slice(1);
      }
    },
  );
}

/**
 * エスケープ文字を解除する。
 *
 * 不正なエスケープがあった場合は例外を投げる。
 * @param s エスケープされた文字列
 * @returns エスケープを解除した文字列
 */
export const unescape: {
  (s: string): string;
  /**
   * エスケープ文字を解除する。
   *
   * 不正なエスケープがあった場合でも例外を投げず`\`を除去するだけに留める。
   * @param s エスケープされた文字列
   * @returns エスケープを解除した文字列
   */
  safe(this: void, s: string): string;
} = Object.freeze(
  Object.assign(
    (s: string) =>
      unescape_implement(s, (message, args) => {
        // replaceのコールバックに渡される引数の先頭はマッチした文字列
        const [match] = args;
        // replaceのコールバックに渡される引数の最後の二つはマッチ位置のインデックスと置換対象の文字列
        const [index, s] = args.slice(-2) as [number, string];
        // エラーがあった該当行を抽出してエラー箇所を表示
        const bol = s.lastIndexOf('\n', index) + 1;
        const eol = (i => (i < 0 ? s.length : i))(s.indexOf('\n', bol));
        const line = s.slice(bol, eol);
        return error.for(SyntaxError)`
          ${
            // エラーメッセージ
            message
          }
          ${
            // エラーのあった該当行
            line
          }
          ${
            // エラー位置までインデント
            ' '.repeat(index - bol)
          }${'^'.repeat(match.length) /* エラーとなった文字数分`^`を連ねる*/}
          `;
      }),
    {
      // 例外を投げない場合はエラー発生時も`\`だけ削除
      safe: (s: string) =>
        unescape_implement(s, (_, [match]) => match.slice(1)),
    },
  ),
);
