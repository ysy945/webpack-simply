function fromDeclarationToExpression(declaration) {
  const map = {
    FunctionDeclaration: "FunctionExpression",
    ObjectExpression: "ObjectExpression",
    ClassDeclaration: "ClassExpression",
    Identifier: "Identifier",
    ArrowFunctionExpression: "ArrowFunctionExpression",
  };
  declaration.type = map[declaration.type];
  return declaration;
}

module.exports = {
  fromDeclarationToExpression,
};
