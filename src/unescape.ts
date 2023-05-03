import assert from 'assert';
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

/**
 * 桁数指定の16進数文字を表す正規表現パターン。キャプチャするところまで含める。
 * @param n1 n2が省略されている場合は桁数。n2が指定されている場合は最小桁数。
 * @param n2 指定した場合は最大桁数。省略時は桁数をn1に固定
 * @returns 生成した正規表現を返す。
 */
const HEXADECIMAL = (n1: number, n2?: number) =>
  regexp.sub/*regexp*/ `([0-9A-Fa-f]{${
    n2 !== undefined ? `${n1},${n2}` : `${n1}`
  }})`;

/**
 * エスケープシーケンスの正規表現。
 */
const ESCAPE_SEQUENCE = regexp/*regexp*/ `
  // 基本的なエスケープシーケンスはエスケープ文字\とそれに続く1文字
  \\[\s\S](?:
    // 1文字が0でそのあとに続く1文字が数字なら(エラーにするために)追加する
    (?<=0)[0-9]
    |
    // 1文字がxでそのあとに続く2文字が16進数文字であれば追加する
    (?<=x)${HEXADECIMAL(2)} // $1
    |
    // 1文字がuでそのあとに続く文字列が以下の場合追加する。
    (?<=u)(?:
      // {～}で囲まれた1～6文字の16進数文字
      \{${HEXADECIMAL(1, 6)}\} // $2
      |
      // 4文字の16進数文字
      ${HEXADECIMAL(4)} // $3
    )
  )? // 上記にマッチしない場合は追加しない
  ${{ flags: 'g' }}
`;

type TaggedTemplate = (
  template: TemplateStringsArray,
  ...values: unknown[]
) => unknown;

/** unescape.safeを使う可能性のあるタグ付きテンプレートの配列 */
const safeUsers: TaggedTemplate[] = [];
/**
 * unescape.safeを使う可能性のあるタグ付きテンプレートとして登録する。
 *
 * @export
 * @param {TaggedTemplate<unknown>} safeUser
 */
export function addSafeUser<TEMPLATE extends TaggedTemplate>(
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
        // 登録された関数からのスタックトレースを構築
        Error.captureStackTrace(ex, f);
        // 行ごとに分解して一行目はエラーメッセージなので除外
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

/**
 * エスケープシーケンスを1文字ごと解除する
 *
 * @param {string} match エスケープシーケンス全体
 * @param {(string | undefined)} $1 2桁の16進数。`\xXX`のXX部分
 * @param {(string | undefined)} $2 1～6桁の16進数。`\u{XXXXX}`のXXXXX部分
 * @param {(string | undefined)} $3 4桁の16進数。`\uXXXX`のXXXX部分
 * @param {number} index 文字列全体の中でのエスケープシーケンスの位置
 * @param {string} s 置換対象の文字列全体
 * @returns {string} エスケープシーケンス解除後の文字
 */
function unescapeCharactor(
  match: string,
  $1: string | undefined,
  $2: string | undefined,
  $3: string | undefined,
  index: number,
  s: string,
): string {
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
      // \8と\9も同様に禁止(古いNodeJSでは許容されているが新しい方に寄せる)
      return processError(
        `\\8 and \\9 are not allowed in indented tagged templates.`,
      );
    case 'u':
    case 'x': {
      // 16進数部分
      const hex = $1 ?? $2 ?? $3;
      if (hex === undefined) {
        // 16進数部分が存在しない => 正しい形式ではなかった
        processError(
          ch === 'u'
            ? `Invalid Unicode escape sequence`
            : `Invalid hexadecimal escape sequence`,
        );
      }
      // 文字コード
      const code = parseInt(hex, 16);
      if (code > 0x10ffff) {
        // Unicodeの範囲外だった(-がパターンにないので負数は考えなくて良い)
        processError(`Undefined Unicode code-point`);
      }
      // 文字コードから文字へ
      return String.fromCodePoint(code);
    }
    default:
      // 単なるエスケープはそのまま`\`だけ削除
      return match.slice(1);
  }
  function processError(message: string): never {
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
    throw new SyntaxError(`${message}\n${line}\n${colPadding}${mark}`);
  }
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
export function unescape(s: string): string {
  return s.replace(ESCAPE_SEQUENCE, unescapeCharactor);
}

/**
 * {@link unescape}と同様にエスケープシーケンスを解除する。
 *
 * ただし、不正なエスケープシーケンスがあった場合でも例外を投げず、`\`を除去するだけ。
 * @param s エスケープされた文字列
 * @returns エスケープを解除した文字列
 */
unescape.safe = function unescapeSafe(s: string): string {
  return s.replace(
    ESCAPE_SEQUENCE,
    (...args: Parameters<typeof unescapeCharactor>) => {
      try {
        return unescapeCharactor(...args);
      } catch (ex) {
        assert(ex instanceof Error);
        // 安全版は警告ログを出してエスケープ文字`\`を除去
        console.warn(`${ex.message}\n${captureStackTrace()}`);
        return args[0].slice(1);
      }
    },
  );
};

Object.freeze(unescape);
