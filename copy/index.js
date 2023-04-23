const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const basedir = path.resolve(__dirname, '..');

(async () => {
  // src/TaggedTemplate.d.tsをlibにコピー
  await copy('src', 'TaggedTemplate.d.ts', 'lib');
})();

/**
 * ファイルをコピーする。ただし、コピー元とコピー先とでハッシュ値が一致したら何もしない。
 * @param {string} sourceDir
 * @param {string} destinationDir
 * @param {string} filename
 * @param {string} [destFilename]
 * @returns {Promise<void>}
 * */
async function copy(sourceDir, filename, destinationDir, destFilename) {
  const dstDir = path.join(basedir, destinationDir);
  await ensure(dstDir);
  const src = path.join(basedir, sourceDir, filename);
  const dst = path.join(destinationDir, destFilename ?? filename);
  const srcHash = await getHash(src);
  const dstHash = await getHash(dst).catch(ex => undefined);
  if (srcHash === dstHash) {
    console.log(
      `${destinationDir}/${destFilename ?? filename}は最新の状態です。`,
    );
    return;
  }
  const srcStat = await fs.promises.stat(src);
  await fs.promises.copyFile(src, dst);
  await fs.promises.utimes(dst, srcStat.atime, srcStat.mtime);
  console.log(
    `${destinationDir}/${
      destFilename ?? filename
    }に${sourceDir}/${filename}をコピーしました。`,
  );
}

/**
 * ディレクトリが存在していなければ作成する。
 *
 * ディレクトリでは無いものが存在していればエラー
 * @param {string} dirpath 対象のディレクトリのパス
 * @returns {Promise<void>}
 */
async function ensure(dirpath) {
  const stat = await fs.promises
    .stat(dirpath)
    .catch(ex => (ex.code === 'ENOENT' ? undefined : Promise.reject(ex)));
  if (stat === undefined) {
    await ensure(path.dirname(dirpath));
    console.log(`mkdir: ${dirpath}`);
    await fs.promises.mkdir(dirpath);
    return;
  }
  if (!stat.isDirectory()) {
    error`${dirpath} は既に存在していますが、ディレクトリではありません。`;
  }
}

/**
 * ファイルのハッシュ値を取得する。
 * @param {string} filepath
 * @returns {Promise<string>}
 */
function getHash(filepath) {
  const hash = crypto.createHash('sha256');
  hash.setEncoding('base64');
  return new Promise((resolve, reject) => {
    const s = fs.createReadStream(filepath);
    s.on('end', () => resolve(hash.read()));
    s.on('error', ex => reject(ex));
    s.pipe(hash);
  });
}
