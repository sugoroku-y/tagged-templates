# tagged-templates

タグ付きテンプレートをいくつか用意しました。

- [`basic`](#basic)
- [`indented`](#indented)
- [`error`](#error)
- [`regexp`](#regexp)

## `basic`

通常のテンプレートリテラルとほぼ同じ仕様のタグ付きテンプレートです。

タグ付きテンプレートなので8進数エスケープシーケンスなどの使用できないはずのエスケープシーケンスが使用されていてもコンパイル時にはエラーになりません(実行時には例外を投げます)。

そんなのが何の役に立つのか…というと別の新たなテンプレートリテラルを実装する際に便利です。

```ts
function newTaggedTemplate(template: TemplateStringsArray, ...values: unknown[]): TaggedTemplateResult {
  return new TaggedTemplateResult(basic(template, ...values));
}
```

のように呼び出せば通常のテンプレートリテラルで生成されるものと同等の文字列を生成して渡せます。

### バリエーション

- `basic.raw`

  `String.raw`と(多分)まったく同じ動きをするタグ付きテンプレートです。

  まったく同じならなんで用意したのかといえば、後述の`indented`と揃えておけば何かと便利なことがあるかもしれないからです。

- `basic.safe`

  不正なエスケープシーケンスが混じっていても例外を投げないタグ付きテンプレートです。

  メッセージの指定に不備があっても文字列の生成に問題がないようにしたいときに使用します。

## `indented`

テンプレート文字列の中からインデントを取り除くタグ付きテンプレートです。

以下のように使用します。

```ts
import { indented } from 'tagged-templates';

const result = indented`
  This is a
   multiline
   string with
   some indentations
  `;
// -> 'This is a\n multiline\n string with\n some indentations'
```

このように、`indented`をテンプレートタグとして使用すると、テンプレート文字列の各行から先頭のインデントを取り除いた文字列が返されます。

このとき取り除くインデントは終端の`` ` ``の前にある空白もしくはタブです。

終端の`` ` ``の前の空白やタブ、およびその前の改行文字は取り除かれます。

先頭は改行で始めてください。この改行も取り除かれます。

テンプレート文字列中で折り返したいけど文字列中に改行を入れたくない、という場合は、テンプレートリテラルと同様に行末にバックスラッシュを置くことで改行を挿入しないようにできます。もちろんこの場合でもインデントは取り除かれます。

```ts
const result = indented`
  This line \
  continues here \
  and does not have \
  its indent removed
  `; // -> 'This is a multiline string with some indentations'
```

### 書式

`indented`で使用されるテンプレート文字列は以下の書式で記述する必要があります。

- 末尾の`` ` ``から行頭までにある連続した空白もしくはタブがインデントと見なされます。
- 末尾の`` ` ``から行頭まで空白もしくはタブだけである必要があります。
- 先頭の`` ` ``の後の文字は改行である必要があります。
- 各行は空行、もしくは行頭がインデントで始まっている必要があります。
- エスケープシーケンスは通常のテンプレートリテラルと同じものが使用できます。
  - `\b`、`\f`、`\n`、`\r`、`\t`、`\v`はそれぞれの制御文字に置換されます。
  - `\x`、`\u`は指定された16進数を文字コードとして置換されます。
  - `\000`のような8進数エスケープシーケンスは使用できません。
    - ただし後ろに数字の続かない`\0`はナル文字に置換されます。
  - `\8`や`\9`も8進数エスケープシーケンスと同様に使用できません。

    ※Node.jsの古いバージョンではテンプレートリテラル中に`\8`や`\9`があってもエラーになりませんが、新しい方に寄せておきます。
  - 改行の前に`\`があるとその改行は取り除かれます。
  - その他の文字が`\`の後ろにある場合、`\`は取り除かれます。

上記の書式に沿っていない場合、もしくは不正なエスケープシーケンスが使用されていた場合、SyntaxErrorを投げます。

### バリエーション

- `indented.raw`

  エスケープシーケンスを制御文字などに置換せず、そのまま文字列として展開する`indented.raw`を用意しています。

  `\`をそのまま文字として利用したい場合にはこちらを使ってください。

- `indented.safe`

  ほぼ`indented`と同じですが書式やエスケープシーケンスが不正な場合でも例外を投げません。

  書式が不正な場合は通常のテンプレートリテラルと同様にインデントの除去を行いません。

  エスケープシーケンスが不正な場合は`\`を除去するだけになります。

  例外処理中などで別の例外を投げるわけにはいかないときにはこちらを使ってください。

## `error`

テンプレート文字列を用いて生成したメッセージを持つ例外をthrowするタグ付きテンプレートです。

以下のように使用します。

```ts
const type =
  value === 'aaa'
    ? 'typeA'
    : value === 'bbb'
    ? 'typeB'
    : error`Unknown value: ${value}`;
```

`error`の返値は`never`型になっているため、3項演算子などで想定外の値を除外できます。

また、`error.as()`を使用することでthrowする例外クラスを指定できます。以下は`SyntaxError`をthrowする例です。

```ts
error.as(SyntaxError)`
  Invalid Unicode character
  ${line}
  ${' '.repeat(col)}^
  `;
```

### メッセージの生成

メッセージは先頭の`` ` ``の直後に改行があれば`indented.safe`を、それ以外であれば`basic.safe`を使用して生成されます。

メッセージ内に改行を入れたい場合には例のように先頭の`` ` ``の直後に改行を入れればインデントした状態で記述できますし、改行を入れなければ通常のテンプレートリテラルとほぼ同様にメッセージを生成します。

また`indented.safe`、`basic.safe`を使用しているためメッセージの記述に問題があった場合(8進数エスケープシーケンスを使っていた、`indented`の書式にあわない記述をしていた、など)でも、メッセージの途中が抜けていたり目的とは違う例外を発生させて問題処理を難しくしてしまうことを防ぎます。

たとえば以下のような記述だと、TypeScriptのコンパイルではエラーになりません。

```ts
throw new Error(`message with \7 Octet escape sequence`);
```

しかも実行時には`SyntaxError: Octal escape sequences are not allowed in template strings.`というエラーになってしまうため、本来のメッセージが表示されず、実際に発生した問題の調査に支障をきたします。

```ts
error`message with \7 Octet escape sequence`;
```

と書いておけば、書いてある内容がほぼそのままの`message with 7 Octet escape sequence`というメッセージ付の例外が投げられるため、どこで発生したのか特定することも簡単になりますし、テンプレートにある程度情報を載せておけば、原因究明にも役に立ちます。

### 型ガード

`error`を使っていると型ガードが働かないことがあります。

```ts
function xxx(a: number | string) {
  if (typeof a === 'string') {
    error``;
  }
  a; // a: number | string のまま
}
```

こういうときは冗長になりますが、`return`で返してやると型ガードが効くようになります。

```ts
function xxx(a: number | string) {
  if (typeof a === 'string') {
    return error``;
  }
  a; // a: number になる!!
}
```

## `regexp`

指定されたテンプレート文字列を元に正規表現オブジェクトを作成するタグ付きテンプレートです。

以下のように使用します。

```ts
const pattern = regexp`^[a-z]+$`;
```

このように、テンプレート文字列に正規表現のパターンを記述して渡すことで、正規表現オブジェクトが生成されます。

このタグ付きテンプレート内ではエスケープシーケンスが処理されないため、`\s`のような`\`を含む正規表現をあつかう際にいちいちエスケープする必要はありません。

```ts
const pattern = regexp`^([a-z]+(?:-[a-z]+)*)\s*=\s*(\d+)$`;
```

### 変数を埋め込む

テンプレート文字列では、値を `${}` で囲んで埋め込むことができますが、`regexp` 関数でも同様に、値を埋め込んだ正規表現を生成できます。

```ts
const username = 'user123';
const pattern = regexp`^${username}[0-9]*$`;
```

`regexp`で埋め込める値には以下の3とおりあります。

- 文字列値

  文字列値が埋め込まれる場合には、その文字列値に含まれる正規表現での特殊文字はすべてエスケープして埋め込まれます。

  ```ts
  const address = 'yebisuya@gmail.com (YEBISUYA Sugoroku)`;
  const pattern = regexp`^From: ${address}$`;
  // -> /^From: yebisuya@gmail\.com \(YEBISUYA Sugoroku\)\(\)$/
  ```

- パターン指定オブジェクト

  `source`という名前のプロパティを持つオブジェクトが指定されると、その`source`プロパティに指定された正規表現のパターンそのものが埋め込まれます。

  ただし前後に影響を与えないように`(?:～)`で囲まれて挿入されます。

  正規表現のインスタンスはまさに`source`という名前のプロパティを持つオブジェクトですので、そのまま利用できます。

  ```ts
  const NULL = /null/;
  const BOOLEAN = /true|false/;
  const NUMBER = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[Ee][+-]?[0-])/;
  const STRING = /"[^"\\]*(?:\\.[^"\\]*)*"/;
  const PRIMITIVE = regexp/*regexp*/ `${NULL}|${BOOLEAN}|${NUMBER}|${STRING}`;
  ```

  regexpタグ付きテンプレートで生成した正規表現も、もちろん正規表現のインスタンスなので埋め込みに利用できます。

  ```ts
  const COMMA_SEPARATED = (begin: string, pattern: RegExp, end: string) => regexp/*regexp*/ `${begin}\s*(?:${pattern}(?:\s*,\s*${pattern})*\s*)?${end}`;
  const ARRAY = COMMA_SEPARATED('[', PRIMITIVE, ']');
  const OBJECT = COMMA_SEPARATED('{', regexp/*regexp*/ `${STRING}\s*:\s*${PRIMITIVE}`, '}');
  ```

  このタグ付きテンプレートに埋め込むためにしか使わないのであれば、regexpタグ付きテンプレートを使っていては正規表現のコンパイル処理がムダになります。その代わりに`source`プロパティだけを持つオブジェクトでもほぼ同様の結果が得られます。

  ```ts
  // 指定の桁数の16進数パターンを生成する(HEXADECIMAL_ESCAPE_SEQUENCEでしか使わないのでregexpタグ付きテンプレートは使わない)
  const HEXADECIMAL = (n1: number, n2?: number) => ({
    source: /*regexp*/ `([0-9A-Fa-f]{${n1}${n2 !== undefined ?`,${n2}`: ''}})`
  });
  // 16進数エスケープシーケンスのパターン
  const HEXADECIMAL_ESCAPE_SEQUENCE = regexp/*regexp*/ `\\(?:x${HEXADECIMAL(2)}|u(?:\{${HEXADECIMAL(1,6)}\}|${HEXADECIMAL(4)}))`;
  ```

  この場合通常のテンプレートリテラルを使うと、特殊文字はエスケープされない、ということに注意してください。

  もちろん正規表現として他の場所で利用することがあるならregexpで生成してください。

- フラグ指定オブジェクト

  `flags`という名前のプロパティを持つオブジェクトが指定されると、その`flags`プロパティに指定されたフラグがマージされます。

  正規表現のインスタンスにも`flags`プロパティがあるため、挿入された正規表現のフラグは継承されます。

  ```ts
  const ALPHABETS = /[A-Z]/i;
  const NUMBERS = /[0-9]/;
  const WORD = regexp`${ALPHABETS}+=${NUMBERS}+`;
  // -> /(?:[A-Z])+=(?:[0-9])+/i
  ```

  フラグだけを指定してパターンを追加したくない場合は`flags`プロパティだけを持つオブジェクトを挿入します。

  ```ts
  const UPPERCASE = /[A-Z]/;
  const WORD = regexp`${UPPERCASE}+${{ flags: 'i' }}`;
  // -> /(?:[A-Z])+/i
  ```

  正規表現のインスタンスや`flags`プロパティを持つオブジェクトで指定されたフラグはマージした状態で指定されます。

  複数の正規表現を埋め込む場合にはそれぞれの正規表現に指定されたフラグがマージされるので、想定した挙動にならない可能性があります。

  ```ts
  const UPPERCASE = /[A-Z]/;
  const ALPHABETS = /[A-Z]/i;
  const pattern = regexp`${UPPERCASE}+\s*=\s*=${ALPHABETS}+`;
  // -> /(?:[A-Z])+\s*=\s*=(?:[A-Z])+/i となり、UPPERCASEもALPHABETSも大文字小文字を区別しない正規表現になってしまう
  ```

### コメント

1行コメント(`//`から改行の前まで)やブロックコメント(`/*`から`*/`まで)が指定できます。

ただし、`/`や`*`がエスケープされているとコメントとは見なされません。

また途中に`${～}`があると1行コメントはそこで終了、ブロックコメントはコメントと見なされなくなるので注意してください。

```ts
const pattern = regexp`
   // 1行コメント
   [A-Za-z_][A-Za-z_0-9]*
   /* ブロックコメント */
   \s*=\s*(?:\S(?:.*\S)?)?\s*
   // 1行コメントの途中: ${''}ここからはコメントにならない
   /* ブロックコメントの途中: ${''} このブロック全体がコメントにならない */
`;
```

### 空白

テンプレートに指定された文字列のうち空白文字(空白、タブ、改行など)は以下のように扱われます。

- エスケープされた空白文字はそのまま残ります。
- 英数字の間にある連続した空白文字は1文字以上の空白文字(`\s+`)に置換されます。
  - エスケープシーケンスで表記されたもの(`\t`や`\n`など)はここでいう空白文字に含まれません。
  - コメントについては除去したあとに判定します。

    1行コメントは改行の前までをコメントと見なして除去します。
- 前後に英数字のない空白文字については除去されます。
- `${～}`部分については実際に挿入される値が英数字かどうかにかかわらず、何もないものと見なされます。

  つまり`${～}`の直前や直後に空白文字があれば除去されます。

```ts
const pattern = regexp`
  abc def    ghi
  jkl mno // line comment
  pqr stu /* block comment
  */ vw/*
  *  英数字の間にコメントしかない場合はコメントが除去されるだけ
  */x// 1行コメントは改行文字の前までがコメントであり、コメントを除去しても改行つまり空白文字が残っていると見なされる
yz
  `; // -> /abc\s+def\s+ghi\s+jkl\s+mno\s+pqr\s+stu\s+vwx\s+yz/
```

### VS Code の拡張機能

VS Codeでこのタグ付きテンプレートを使う場合は`Comment tagged template`をインストールしておくことをオススメします。

この拡張機能をインストールした上で、以下のように記述すると

```ts
const pattern = regexp/* regexp */ `
   [A-Za-z_][A-Za-z_0-9]*
`;
```

テンプレート内の文字列が正規表現のシンタックスで色付けされるので便利です。

括弧の対応も表示されるので、正規表現リテラルで書くよりもこちらで書きたくなります。
