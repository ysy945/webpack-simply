const { tokenizer, transformer, generator } = require("jsx-to-js-ysy");

function loader(sourceCode) {
  if (!Buffer.isBuffer(sourceCode)) {
    sourceCode = Buffer.from(sourceCode);
  }
  const tokens = tokenizer(sourceCode);
  const tree = transformer(tokens);
  return generator(tree);
}

module.exports = loader;
