import { prepareTemplate as p, taggedTemplateBase } from './taggedTemplateBase';
import { unescape, addSafeUser } from './unescape';

const { raw: prepareTemplate } = p;

/**
 * 通常のテンプレートリテラルと同じ文字列を生成するタグ付きテンプレート。
 *
 * テンプレート文字列中のエスケープシーケンスが正しくない場合には例外を投げる。
 */
export const basic = Object.freeze(
  Object.assign(
    taggedTemplateBase({
      prepareTemplate,
      modifyTemplate: unescape,
    }),
    {
      /**
       * String.rawと同じくエスケープシーケンスを処理しないタグ付きテンプレート。
       */
      raw: taggedTemplateBase({ prepareTemplate }),
      /**
       * 通常のテンプレートリテラルとほぼ同じ文字列を生成するタグ付きテンプレート。
       *
       * テンプレート文字列中のエスケープシーケンスが正しくない場合には例外を投げずに`\`を取り除く。
       */
      safe: addSafeUser(
        taggedTemplateBase({
          prepareTemplate,
          modifyTemplate: unescape.safe,
        }),
      ),
    },
  ),
);
