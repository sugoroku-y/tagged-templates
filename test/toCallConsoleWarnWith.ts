expect.extend({ toCallConsoleWarnWith });

function toCallConsoleWarnWith(
  this: jest.MatcherContext,
  receive: () => unknown,
  ...strings: (string | RegExp)[]
): jest.CustomMatcherResult | Promise<jest.CustomMatcherResult> {
  /** この関数の終了時にrestoreするかどうか */
  let restorable = true;
  /** console.warnのモック */
  const mock = jest
    .spyOn(console, 'warn')
    // 出力が邪魔なので何もしない関数に置き換え
    .mockImplementation(() => undefined);
  /** テストの結果を返す */
  const generateResult = () => {
    const received = mock.mock.calls;
    // console.warnに渡された引数に指定されたすべての文字列を含むものもしくは正規表現にマッチするものが含まれているか
    const expected: unknown = expect.arrayContaining(
      strings.map<unknown>(str =>
        expect.arrayContaining([
          typeof str === 'string'
            ? expect.stringContaining(str)
            : expect.stringMatching(str),
        ]),
      ),
    );
    return {
      pass: this.equals(expected, received),
      message: () => this.utils.diff(expected, received) ?? '',
    };
  };
  try {
    const result = receive();
    if (result instanceof Promise) {
      // 非同期関数だったのでこの呼び出し内ではrestoreしない
      restorable = false;
      return (async () => {
        try {
          // 非同期の処理が完了まで待機
          await result;
          return generateResult();
        } finally {
          // 非同期の処理が完了したのでrestoreする
          mock.mockRestore();
        }
      })();
    }
    return generateResult();
  } finally {
    if (restorable) {
      // 非同期でなければここでrestoreする
      mock.mockRestore();
    }
  }
}
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T> {
      toCallConsoleWarnWith(
        ...args: T extends () => unknown
          ? (string | RegExp)[]
          : [] & 'expectには関数を指定してください'
      ): T extends () => infer TR
        ? TR extends Promise<unknown>
          ? Promise<R>
          : R
        : never;
    }
  }
}

export {};
