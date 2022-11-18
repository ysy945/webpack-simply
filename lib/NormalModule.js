const path = require("path");
const types = require("@babel/types");
const generator = require("@babel/generator").default;
const traverse = require("@babel/traverse").default;
const { runLoaders } = require("loader-runner");
const { fromDeclarationToExpression } = require("./utils");

class NormalModule {
  constructor({
    name,
    context,
    rawRequest,
    resource,
    parser,
    moduleId,
    async,
  }) {
    this.name = name;
    this.context = context;
    this.rawRequest = rawRequest;
    //这是一个AST解析器,可以把源代码转成AST抽象语法树
    this._resource = resource;
    this.parser = parser;
    this._source; //这个模块对应的代码
    this._ast; //这个模块的ast抽象语法树
    this.dependencies = []; //当前模块依赖的模块信息
    this.moduleId = moduleId;
    this.blocks = []; //当前模块依赖那些异步模块import(那些模块)
    this.async = async; //这个模块是一个异步代码块还是一个同步代码块
  }
  /**
   *
   * @param {*} compilation //编译的对象
   * @param {*} callback //编译完成的回调函数
   * 1.从硬盘上把模块内容读出来,读成一个文本
   * 2.可能它不是一个JS模块,可能会走loader的装换,最终肯定要得到一个js模块 如果得不到就报错
   * 3.把这个JS模块代码经过PARSER的处理转换为AST
   * 4.分析AST中的依赖 找到require import节点 分析依赖的模块
   * 5.递归的编译依赖的模块
   * 6.不停的依次递归执行上面五部,直到所有的模块都编译完成为止
   */
  build(compilation, callback) {
    this.doBuild(compilation, (err) => {
      this._ast = this.parser.parse(this._source);

      traverse(this._ast, {
        ImportDeclaration: (nodePath) => {
          if (nodePath.node.specifiers.length > 0) {
            //import {a as ab,b,c} from "./a" => const {a:ab,b,c} = require("./a")
            //变量名
            const variableNames = []; //[{imported:'a',local:'ab'}]
            //获取引用的地址 //"./a"
            const filePath = nodePath.node.source.value;
            nodePath.node.specifiers.forEach((ImportSpecifier) => {
              // console.log(JSON.stringify(ImportSpecifier, null, 2));
              //如果是ImportDefaultSpecifier类型
              if (types.isImportDefaultSpecifier(ImportSpecifier)) {
                variableNames.push({
                  type: "ImportDefaultSpecifier",
                  imported: ImportSpecifier.local.name,
                  local: ImportSpecifier.local.name,
                });
              }
              if (types.isImportSpecifier(ImportSpecifier)) {
                variableNames.push({
                  type: "ImportSpecifier",
                  imported: ImportSpecifier.imported.name,
                  local: ImportSpecifier.local.name,
                });
              }
            });
            const parseStrArr = [`const `];
            const variables = [];
            let isAddDefault = true;
            variableNames.forEach((variableObj) => {
              const { type, local, imported } = variableObj;
              if (type === "ImportDefaultSpecifier") {
                parseStrArr.push(
                  `const ${local} = require(` + `'${filePath}')\r\n`
                );
              } else if (type === "ImportSpecifier") {
                if (variableNames[0].type === "ImportDefaultSpecifier")
                  isAddDefault = false;
                variables.push(
                  `${local === imported ? local : imported + ":" + local}`
                );
              }
            });
            let parseStr = "";

            if (
              variableNames.length === 1 &&
              variableNames[0].type === "ImportDefaultSpecifier"
            ) {
              parseStrArr.shift();
            } else {
              parseStr =
                parseStrArr.shift() +
                "{" +
                variables.join(",") +
                "}" +
                ` = require(` +
                (isAddDefault ? "" : "/*this is es module*/") +
                `'${filePath}')\r\n`;
            }

            parseStr += parseStrArr.join("");
            // console.log(parseStr);
            // const [firstNode, secondNode] =

            nodePath.replaceWithMultiple([
              ...this.parser.parse(parseStr).program.body,
            ]);
          } else {
            const value = nodePath.node.source.value;
            nodePath.replaceWithSourceString(`require('${value}')`);
          }
        },
        // export default {} => module.exports = {}
        ExportDefaultDeclaration: (nodePath) => {
          const left = types.memberExpression(
            types.identifier("module"),
            types.identifier("exports")
          );
          const declaration = nodePath.node.declaration;
          const right = fromDeclarationToExpression(declaration);
          nodePath.replaceWith(
            types.expressionStatement(
              types.assignmentExpression("=", left, right)
            )
          );
        },
        // export function a(){} => exports.a = function(){}
        ExportNamedDeclaration: (nodePath) => {
          const { node } = nodePath;
          //如果这是一个function 或则 class 获取他们的变量名称 并修改ast语法树
          if (
            types.isFunctionDeclaration(node.declaration) ||
            types.isClassDeclaration(node.declaration)
          ) {
            const defaultName = node.declaration.id.name;
            const left = types.memberExpression(
              types.identifier("exports"),
              types.identifier(defaultName),
              false
            );
            const right = fromDeclarationToExpression(node.declaration);
            nodePath.replaceWith(
              types.expressionStatement(
                types.assignmentExpression("=", left, right)
              )
            );
          }
          // export const a = 1 如果是这种语句 => const a = 1 exports.a = a
          else if (types.isVariableDeclaration(node.declaration)) {
            //缓存节点
            const declaration = node.declaration;
            const defaultName = declaration.declarations[0].id.name;
            const left = types.memberExpression(
              types.identifier("exports"),
              types.identifier(defaultName)
            );
            const right = types.identifier(defaultName);
            const nextStatement = types.expressionStatement(
              types.assignmentExpression("=", left, right)
            );
            nodePath.replaceWith(declaration);
            nodePath.insertAfter(nextStatement);
          }
        },
        //拦截import("index.css") 将其转换为require('index.css')
        CallExpression: (nodePath) => {
          if (
            types.isImport(nodePath.node.callee) &&
            !types.isMemberExpression(nodePath.parent)
          ) {
            nodePath.node.callee = types.identifier("require");
          }
        },
        //将import().then(res=>{res = res.default})
        MemberExpression: (nodePath) => {
          const node = nodePath.node;
          //如果它的子节点是import节点
          if (node.object?.callee?.type === "Import") {
            const params = nodePath.parent.arguments[0].params;
            let paramName;
            if (params.length > 0) {
              paramName = params[0].loc.identifierName;
            }
            const left = types.identifier(paramName);
            const right = types.memberExpression(
              types.identifier(paramName),
              types.identifier("default")
            );
            nodePath.parent.arguments[0].body.body.unshift(
              types.expressionStatement(
                types.assignmentExpression("=", left, right)
              )
            );
          }
        },
      });

      //遍历语法树,找到里面的依赖进行依赖收集
      traverse(this._ast, {
        //当遍历到CallExpression节点的时候就会进入回调
        CallExpression: (nodePath) => {
          const node = nodePath.node;

          if (node.callee.name === "require") {
            //修改require这个函数的名称
            node.callee.name = "__webpack_require__";
            //如果方法名是一个require方法的话
            const moduleName = node.arguments[0].value; //模块名称
            //如果有注释内容的话且为this is es module就不
            if (
              node.arguments[0].leadingComments &&
              node.arguments[0].leadingComments[0].value === "this is es module"
            ) {
              //如果进来了 代表不需要添加default什么也不做
            }
            //否则添加default
            else {
              nodePath.parent.init = types.memberExpression(
                nodePath.node,
                types.identifier("default"),
                false
              );
            }
            let depResource;
            //名称是以.开头的说明是一个本地模块或则说用户自定义模块
            if (moduleName.startsWith(".")) {
              const extName =
                moduleName.split(path.posix.sep).pop().indexOf(".") === -1
                  ? ".js"
                  : "";
              //获取依赖模块("./src/index.js")的绝对路径
              depResource = path.posix.join(
                path.posix.dirname(this._resource),
                moduleName + extName
              );
              try {
                const stats = compilation.inputFileSystem.statSync(depResource);
              } catch (err) {
                //如果不是一个文件
                depResource = path.posix.join(
                  path.posix.dirname(depResource),
                  moduleName,
                  "index.js"
                );
              }

              //否则是node_modules中的模块
            } else {
              // depResource = path.posix.join(
              //   this.context,
              //   "node_modules",
              //   moduleName,
              //   "index.js"
              // );
              depResource = require.resolve(
                path.posix.join(this.context, "node_modules", moduleName)
              );
              depResource = depResource.replace(/\\/g, "/");
            }
            //获取依赖的模块ID ./从根目录
            const depModuleId = "." + depResource.slice(this.context.length);
            //修改require中的参数
            // node.arguments[0] = [types.stringLiteral(depModuleId)];
            node.arguments[0].value = depModuleId;
            this.dependencies.push({
              name: this.name, //模块名称
              context: this.context, //根目录
              rawRequest: moduleName, //模块的相对路径
              moduleId: depModuleId, //模块ID 它是一个相对于根目录的相对路径
              resource: depResource, //依赖模块的绝对路径
              async: false, //是否是import懒加载模块
            });
          }
          //1.判断CallExpression的callee是不是import类型
          else if (
            types.isImport(node.callee) &&
            types.isMemberExpression(nodePath.parent)
          ) {
            //2.模块的名称 ./title.js
            const moduleName = node.arguments[0].value;
            const extName =
              moduleName.split(path.posix.sep).pop().indexOf(".") === -1
                ? ".js"
                : "";
            //3.获取依赖的模块的绝对路径
            const depResource = path.posix.join(
              path.posix.dirname(this._resource),
              moduleName + extName
            );
            //4.依赖的模块ID
            const depModuleId =
              "./" + path.posix.relative(this.context, depResource);
            // webpackChunkName:'title'
            let chunkName = "0";
            if (
              Array.isArray(node.arguments[0].leadingComments) &&
              node.arguments[0].leadingComments.length > 0
            ) {
              const leadingComments =
                node.arguments[0].leadingComments[0].value;
              const regexp = /webpackChunkName:\s*['"]([^'"]+)['"]/;
              chunkName = leadingComments.match(regexp)[1];
            }
            nodePath.replaceWithSourceString(
              `__webpack_require__.e("${chunkName}").then(__webpack_require__.bind(null,"${depModuleId}",7))`
            );
            this.blocks.push({
              context: this.context,
              entry: depModuleId,
              name: chunkName,
              async: true, //异步的代码块
            });
          }
        },
      });
      //讲转换后的语法树重新生成源代码
      let { code } = generator(this._ast);
      // console.log(code);
      // console.log(code);
      this._source = code;
      //循环构建每一个异步代码块,都构建完成后才会代表当前的模块编译完成
      let tasksIdx = 0;
      const done = () => {
        if (tasksIdx++ === this.blocks.length) {
          callback();
        }
      };
      this.blocks.forEach(({ context, entry, name }) => {
        compilation._addModuleChain(context, entry, name, true, done);
      });
      done();
    });
  }
  //读取模块代码
  doBuild(compilation, callback) {
    //获取源代码
    this.getSource(compilation, (err, source) => {
      //把最原始的代码存放到当前的_source属性上
      //读出来的模块进行loaders-runner转换
      let {
        module: { rules },
      } = compilation.options;
      let loaders = [];
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        if (rule.test.test(this._resource)) {
          loaders.push(...rule.use);
        }
      }
      // 拿到loader的绝对路径的数组
      const resolveLoader = (loader) =>
        require.resolve(path.resolve(__dirname, "loaders", loader));
      loaders = loaders.map(resolveLoader);
      runLoaders(
        {
          resource: this._resource,
          loaders,
        },
        (err, { result }) => {
          this._source = result.toString();
          // console.log(this._source);
          callback();
        }
      );
    });
  }
  //读取真正的源代码
  getSource(compilation, callback) {
    // console.log(this._resource);
    compilation.inputFileSystem.readFile(this._resource, "utf-8", callback);
  }
}

/**
 * 非常的重要的问题
 * 模块ID问题
 * 不管你是相对的本地模块还是一个第三方模块
 * 最后他的moduleID都是以个相对路径 相对于项目根目录的路径
 * ./src/title.js
 * ./src/index.js
 * ./node_modules/util/util.js
 * 路径分隔符一定是linux中的/ 而不是window中的\
 */

/**
 * 如何处理懒加载
 * 1.先把代码转成AST语法树
 * 2.找出动态import节点
 */

module.exports = NormalModule;
