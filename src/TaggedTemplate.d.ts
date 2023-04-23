export type TaggedTemplate<R = string, VALUES = unknown> = (
  this: void,
  template: TemplateStringsArray,
  ...values: VALUES[]
) => R;
