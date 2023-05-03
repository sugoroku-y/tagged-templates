export function taggedTemplateBase<R = unknown>(
  template: readonly string[],
  values: R[],
  convert: (value: R) => string = String,
): string {
  return template.length === 0
    ? ''
    : template.reduce((r, e, i) =>
        r.concat(
          convert(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- values.length = template.length - 1なので(Rがundefinedを含まない限り)undefinedになることはない
            values[i - 1]!,
          ),
          e,
        ),
      );
}
