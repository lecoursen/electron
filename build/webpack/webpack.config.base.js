const fs = require('fs')
const path = require('path')
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack')

const electronRoot = path.resolve(__dirname, '../..')

const onlyPrintingGraph = !!process.env.PRINT_WEBPACK_GRAPH

const buildFlagArg = process.argv.find(arg => arg.startsWith('--buildflags='));

class AccessDependenciesPlugin {
  apply (compiler) {
    // Only hook into webpack when we are printing the dependency graph
    if (!onlyPrintingGraph) return

    compiler.hooks.compilation.tap('AccessDependenciesPlugin', compilation => {
      compilation.hooks.finishModules.tap('AccessDependenciesPlugin', modules => {
        const filePaths = modules.map(m => m.resource).filter(p => p).map(p => path.relative(electronRoot, p))
        console.info(JSON.stringify(filePaths))
      })
    })
  }
}

function generateBuildFlagDefines() {
  if (!buildFlagArg) return {}
  const buildFlagPath = buildFlagArg.substr(13)

  const defines = {
    BUILDFLAG: ' '
  }

  const flagFile = fs.readFileSync(buildFlagPath, 'utf8')
  for (const line of flagFile.split(/(\r\n|\r|\n)/g)) {
    const flagMatch = line.match(/#define BUILDFLAG_INTERNAL_(.+?)\(\) \(([01])\)/)
    if (flagMatch) {
      defines[flagMatch[1]] = JSON.stringify(Boolean(parseInt(flagMatch[2], 10)))
    }
  }

  return defines
}

// console.log(generateBuildFlagDefines())
// process.exit(1);

module.exports = ({
  alwaysHasNode,
  loadElectronFromAlternateTarget,
  targetDeletesNodeGlobals,
  target
}) => {
  let entry = path.resolve(electronRoot, 'lib', target, 'init.ts')
  if (!fs.existsSync(entry)) {
    entry = path.resolve(electronRoot, 'lib', target, 'init.js')
  }

  return ({
    mode: 'development',
    devtool: 'inline-source-map',
    entry,
    target: alwaysHasNode ? 'node' : 'web',
    output: {
      filename: `${target}.bundle.js`
    },
    resolve: {
      alias: {
        '@electron/internal': path.resolve(electronRoot, 'lib'),
        'electron': path.resolve(electronRoot, 'lib', loadElectronFromAlternateTarget || target, 'api', 'exports', 'electron.js'),
        // Force timers to resolve to our dependency that doens't use window.postMessage
        'timers': path.resolve(electronRoot, 'node_modules', 'timers-browserify', 'main.js')
      },
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [{
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          configFile: path.resolve(electronRoot, 'tsconfig.electron.json'),
          transpileOnly: onlyPrintingGraph,
          ignoreDiagnostics: [6059]
        }
      }]
    },
    node: {
      __dirname: false,
      __filename: false,
      // We provide our own "timers" import above, any usage of setImmediate inside
      // one of our renderer bundles should import it from the 'timers' package
      setImmediate: false
    },
    plugins: [
      new AccessDependenciesPlugin(),
      ...(targetDeletesNodeGlobals ? [
        new webpack.ProvidePlugin({
          process: ['@electron/internal/renderer/webpack-provider', 'process'],
          global: ['@electron/internal/renderer/webpack-provider', '_global'],
          Buffer: ['@electron/internal/renderer/webpack-provider', 'Buffer'],
        })
      ] : []),
      new webpack.DefinePlugin(generateBuildFlagDefines())
    ],
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          extractComments: false,
          terserOptions: {
            sourceMap: true,
            ecma: undefined,
            warnings: false,
            parse: {},
            compress: {
              // Strip dead code
              passes: 1,
              booleans: true,
              conditionals: true,
              dead_code: true,
              evaluate: true,
              keep_classnames: true,
              keep_fnames: true,

              // Disable everything else
              defaults: false
            },
            mangle: false,
            module: false,
            output: {
              comments: true,
              beautify: true
            },
            toplevel: false,
            nameCache: null,
            ie8: false,
            keep_classnames: true,
            keep_fnames: true,
            safari10: false
          }
        })
      ]
    }
  })
}
