import type { TaggedTemplate } from './TaggedTemplate';
import { regexp } from './regexp';

/**
 * エスケープシーケンスのうち、固定変換マップ
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
  // 8進数エスケープシーケンスの中でも`\0`だけは例外的に許可
  '\\0': '\0',
} as const;

const ESCAPE_SEQUENCE = regexp/*regexp*/ `
  // 基本的なエスケープシーケンスはエスケープ文字\とそれに続く1文字
  \\[\s\S](?:
    // 1文字が0でそのあとに続く1文字が数字なら(エラーにするために)追加する
    (?<=0)[0-9]
    |
    // 1文字がxでそのあとに続く2文字が16進数文字であれば追加する
    (?<=x)([0-9A-Fa-f]{2}) // $1
    |
    // 1文字がuでそのあとに続く文字列が以下の場合追加する。
    (?<=u)(?:
      // {～}で囲まれた1～6文字の16進数文字
      \{([0-9A-Fa-f]{1,6})\} // $2
      |
      // 4文字の16進数文字
      ([0-9A-Fa-f]{4}) // $3
    )
  )?
  ${{ flags: 'g' }}
`;

/** unescape.safeを使う可能性のあるタグ付きテンプレートの配列 */
const safeUsers: TaggedTemplate<unknown>[] = [];
/**
 * unescape.safeを使う可能性のあるタグ付きテンプレートとして登録する。
 *
 * @export
 * @param {TaggedTemplate<unknown>} safeUser
 */
export function addSafeUser<TEMPLATE extends TaggedTemplate<unknown>>(
  safeUser: TEMPLATE,
): TEMPLATE {
  safeUsers.push(safeUser);
  return safeUser;
}

/**
 * タグ付きテンプレートまでの呼び出しスタックトレースを返す。
 *
 * 登録されたタグ付きテンプレート以外から呼び出されていた場合は空文字列を返す。
 * @export
 * @returns {string}
 */
export function captureStackTrace(): string {
  // unescape.safeが使われる可能性のあるexportされた関数群から大元の呼び出しもとを探す
  return (
    safeUsers
      .map(f => {
        const ex = { stack: '' };
        Error.captureStackTrace(ex, f);
        return ex.stack.split('\n').slice(1);
      })
      // 0なのはスタックトレース上にない関数なので除外
      .filter(a => a.length > 0)
      // 最短のスタックトレースを検索
      .reduce((a, b) => {
        // istanbul ignore next -- 現状ではbの方しか採用されないが問題ない
        return a.length < b.length ? a : b;
      })
      // 念の為3つほど遡れるようにする
      .slice(0, 3)
      .join('\n')
  );
}

function prepare(handleError: (message: string) => void) {
  return function unescape(s: string): string {
    return s.replace(
      ESCAPE_SEQUENCE,
      (
        /** マッチした文字列全体 */
        match,
        /** 1つ目のキャプチャ。`\xXX`のXX部分 */
        $1: string | undefined,
        /** 2つ目のキャプチャ。`\u{XXXXX}`のXXXXX部分 */
        $2: string | undefined,
        /** 3つ目のキャプチャ。`\uXXXX`のXXXX部分 */
        $3: string | undefined,
        /** マッチした箇所のインデックス */
        index: number,
      ) => {
        if (match in UNESCAPE_MAP) {
          // 固定変換
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
            return processError(
              `Octal escape sequences are not allowed in indented tagged templates.`,
            );
          case '8':
          case '9':
            // \8と\9も同様に禁止
            return processError(
              `\\8 and \\9 are not allowed in indented tagged templates.`,
            );
          case 'u':
          case 'x': {
            // 16進数部分
            const hex = $1 ?? $2 ?? $3;
            if (hex === undefined) {
              // 16進数部分が存在しない => 正しい形式ではなかった
              return processError(
                ch === 'u'
                  ? `Invalid Unicode escape sequence`
                  : `Invalid hexadecimal escape sequence`,
              );
            }
            // 文字コード
            const code = parseInt(hex, 16);
            if (code > 0x10ffff) {
              // Unicodeの範囲外だった(-がパターンにないので負数は考えなくて良い)
              return processError(`Undefined Unicode code-point`);
            }
            // 文字コードから文字へ
            return String.fromCodePoint(code);
          }
          default:
            // 単なるエスケープはそのまま`\`だけ削除
            return match.slice(1);
        }
        function processError(message: string) {
          // エラーがあった該当行を抽出してエラー箇所を表示
          const bol = s.lastIndexOf('\n', index) + 1;
          const eol = (i => (i < 0 ? s.length : i))(s.indexOf('\n', bol));
          // エラーのあった該当行
          const line = s.slice(bol, eol);
          // エラーのあった位置までインデント
          const colPadding = ' '.repeat(index - bol);
          // エラー箇所の文字数にあわせる
          const mark = '^'.repeat(match.length);
          // 例外を投げる or ログ出力
          handleError(`${message}\n${line}\n${colPadding}${mark}`);
          // 例外を投げない場合はエラー発生時も`\`だけ削除
          return match.slice(1);
        }
      },
    );
  };
}

/**
 * タグ付きテンプレート向けのエスケープシーケンスを本来の文字に置換する。
 *
 * 不正なエスケープシーケンスがあった場合は例外を投げる。
 *
 * - `\b`、`\f`、`\n`、`\r`、`\t`、`\v`はそれぞれの制御文字に置換される。
 * - 行末に`\`があった場合、その行の改行文字は除去される。
 * - 8進数文字コードエスケープシーケンスは使用不可。
 *   - ただし、後ろに数字の続かない`\0`はナル文字に変換される。
 * - 合わせて`\8`、`\9`も使用不可。
 * - `\x`は続く2文字の16進数を文字コードとして変換する。
 * - `\u`は続く4文字の16進数、もしくは`{～}`で囲まれた1～6文字の16進数をコードポイントとして変換する。
 *   - `\u{～}`で指定できるコードポイントは0x10ffffまで。
 * - 上記以外のエスケープシーケンスは`\`を取り除くだけ。
 * @param s エスケープシーケンスを含む文字列
 * @returns エスケープシーケンスを置換した文字列
 * @throws SyntaxError 不正なエスケープシーケンスがあった場合
 */
export const unescape: {
  (s: string): string;
  /**
   * {@link unescape}と同様にエスケープシーケンスを解除する。
   *
   * ただし、不正なエスケープシーケンスがあった場合でも例外を投げず、`\`を除去するだけ。
   * @param s エスケープされた文字列
   * @returns エスケープを解除した文字列
   */
  readonly safe: (this: void, s: string) => string;
} = Object.freeze(
  Object.assign(
    prepare(message => {
      // 通常版では例外を投げる
      throw new SyntaxError(message);
    }),
    {
      safe: prepare(message => {
        // 安全版は警告ログを出すだけ
        console.warn(`${message}\n${captureStackTrace()}`);
      }),
    },
  ),
);
