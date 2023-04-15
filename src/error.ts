import { indented } from './indented';

function error_implement<ERROR extends object>(
  clazz: new (message?: string) => ERROR,
  ...args: [TemplateStringsArray, ...unknown[]]
): never {
  // エスケープ文字に不備があると本来のエラーメッセージにならないのでindented.safeを使う
  const ex = new clazz(indented.safe(...args));
  // スタックトレースからこの関数を除去
  Error.captureStackTrace(ex, error_implement);
  throw ex;
}

export const error: {
  (template: TemplateStringsArray, ...values: unknown[]): never;
  for<ERROR extends object>(
    this: void,
    clazz: new (message?: string) => ERROR,
  ): (...args: [TemplateStringsArray, ...unknown[]]) => never;
} = Object.freeze(
  Object.assign(error_implement.bind(null, Error), {
    for<ERROR extends object>(clazz: new (message?: string) => ERROR) {
      return error_implement.bind(null, clazz);
    },
  }),
);
