module.exports = function (source) {
  let str = `
      const style = document.createElement('style');
      style.innerHTML = \`${source}\`;
      document.head.append(style);
    `;
  return str;
};
