function chunkTemplate(chunkName, modules) {
  const body = [];
  modules.forEach((module) => {
    body.push(
      "'" + module.moduleId + "':",
      `function(module,exports,__webpack_require__){
            ${module._source}
     },`
    );
  });
  const content = `(window['webpackJsonp'] = window['webpackJsonp']||[]).push([['${chunkName}'],{
       ${body.join("")}
   }])`;

  return content;
}

module.exports = chunkTemplate;
