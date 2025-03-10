"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const rollup_plugin_external_globals_1 = __importDefault(require("rollup-plugin-external-globals"));
const serve_static_1 = __importDefault(require("serve-static"));
const vite_1 = require("vite");
function vitePluginCesium(options = {
    rebuildCesium: false,
    devMinifyCesium: false
}) {
    const { rebuildCesium, devMinifyCesium } = options;
    const cesiumBuildRootPath = 'node_modules/cesium/Build';
    const cesiumBuildPath = 'node_modules/cesium/Build/Cesium/';
    let CESIUM_BASE_URL = 'cesium/';
    let outDir = 'dist';
    let base = '/';
    let isBuild = false;
    return {
        name: 'vite-plugin-cesium',
        config(c, { command }) {
            var _a;
            isBuild = command === 'build';
            if (c.base) {
                base = c.base;
                if (base === '')
                    base = './';
            }
            if ((_a = c.build) === null || _a === void 0 ? void 0 : _a.outDir) {
                outDir = c.build.outDir;
            }
            CESIUM_BASE_URL = path_1.default.posix.join(base, CESIUM_BASE_URL);
            const userConfig = {};
            if (!isBuild) {
                // -----------dev-----------
                userConfig.optimizeDeps = {
                    exclude: ['cesium']
                };
                userConfig.define = {
                    CESIUM_BASE_URL: JSON.stringify(CESIUM_BASE_URL)
                };
            }
            else {
                // -----------build------------
                if (rebuildCesium) {
                    // build 1) rebuild cesium library
                    userConfig.build = {
                        assetsInlineLimit: 0,
                        chunkSizeWarningLimit: 5000,
                        rollupOptions: {
                            output: {
                                intro: `window.CESIUM_BASE_URL = "${CESIUM_BASE_URL}";`
                            }
                        }
                    };
                }
                else {
                    // build 2) copy Cesium.js later
                    userConfig.build = {
                        rollupOptions: {
                            external: ['cesium'],
                            plugins: [(0, rollup_plugin_external_globals_1.default)({ cesium: 'Cesium' })]
                        }
                    };
                }
            }
            return userConfig;
        },
        configureServer({ middlewares }) {
            const cesiumPath = path_1.default.join(cesiumBuildRootPath, devMinifyCesium ? 'Cesium' : 'CesiumUnminified');
            console.log(CESIUM_BASE_URL);
            middlewares.use(path_1.default.join('/', CESIUM_BASE_URL), (0, serve_static_1.default)(cesiumPath));
        },
        async closeBundle() {
            if (isBuild) {
                try {
                    await fs_extra_1.default.copy(path_1.default.join(cesiumBuildPath, 'Assets'), path_1.default.join(outDir, 'cesium/Assets'));
                    await fs_extra_1.default.copy(path_1.default.join(cesiumBuildPath, 'ThirdParty'), path_1.default.join(outDir, 'cesium/ThirdParty'));
                    await fs_extra_1.default.copy(path_1.default.join(cesiumBuildPath, 'Workers'), path_1.default.join(outDir, 'cesium/Workers'));
                    await fs_extra_1.default.copy(path_1.default.join(cesiumBuildPath, 'Widgets'), path_1.default.join(outDir, 'cesium/Widgets'));
                    if (!rebuildCesium) {
                        await fs_extra_1.default.copy(path_1.default.join(cesiumBuildPath, 'Cesium.js'), path_1.default.join(outDir, 'cesium/Cesium.js'));
                    }
                }
                catch (err) {
                    console.error('copy failed', err);
                }
            }
        },
        transformIndexHtml() {
            const tags = [
                {
                    tag: 'link',
                    attrs: {
                        rel: 'stylesheet',
                        href: (0, vite_1.normalizePath)(path_1.default.join(CESIUM_BASE_URL, 'Widgets/widgets.css')),
                    }
                }
            ];
            if (isBuild && !rebuildCesium) {
                tags.push({
                    tag: 'script',
                    attrs: {
                        src: (0, vite_1.normalizePath)(path_1.default.join(CESIUM_BASE_URL, 'Cesium.js')),
                    }
                });
            }
            return tags;
        }
    };
}
exports.default = vitePluginCesium;
