"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.getStoreInstance = void 0;

var _utils = require("./utils");

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

;
;
;
;
;
var currentStoreInstance;

var createStore = function createStore() {
  var modules = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var lazyModules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var initStates = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var middlewares = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

  var currentInitStates = _objectSpread({}, initStates);

  var currentModules = {};
  var currentLazyModules = lazyModules;
  var listeners = {};
  var allModuleNames;
  var currentMiddlewares = middlewares;
  var actionsProxyCache = {};
  var stateProxyCache = {};
  var mapsProxyCache = {};
  var mapsWatcher = {};
  var stateDepends = {};
  var modulesCache = {};
  var keysOfModuleStateChangedRecords = {};

  var replaceModule = function replaceModule(moduleName, storeModule) {
    var res = _objectSpread({}, storeModule, {
      state: _objectSpread({}, storeModule.state)
    });

    if (!!currentInitStates[moduleName]) {
      res = _objectSpread({}, storeModule, {
        state: _objectSpread({}, storeModule.state, {}, currentInitStates[moduleName])
      });
      delete currentInitStates[moduleName];
    }

    return res;
  }; // 查看module是否存在


  var hasModule = function hasModule(moduleName) {
    return !!currentModules[moduleName];
  };

  var checkModuleIsValid = function checkModuleIsValid(moduleName) {
    if (!hasModule(moduleName)) {
      throw new Error("module: ".concat(moduleName, " is not valid!"));
    }
  };

  var clearActionsProxyCache = function clearActionsProxyCache(moduleName) {
    return delete actionsProxyCache[moduleName];
  };

  var clearStateProxyCache = function clearStateProxyCache(moduleName) {
    delete stateProxyCache[moduleName];

    for (var key in stateDepends[moduleName]) {
      stateDepends[moduleName][key].destroy();
      delete stateDepends[moduleName][key];
    }

    delete stateDepends[moduleName];
  };

  var clearMapsProxyCache = function clearMapsProxyCache(moduleName) {
    delete mapsProxyCache[moduleName];

    for (var key in mapsWatcher[moduleName]) {
      mapsWatcher[moduleName][key].destroy();
      delete mapsWatcher[moduleName][key];
    }

    delete mapsWatcher[moduleName];
  };

  var clearMapsWatcherCache = function clearMapsWatcherCache(moduleName, changedStateNames) {
    var targetMapsWatcher = mapsWatcher[moduleName];

    if (!!changedStateNames) {
      changedStateNames.forEach(function (stateName) {
        if (stateDepends[moduleName][stateName]) {
          stateDepends[moduleName][stateName].notify();
        }
      });
    } else {
      for (var key in targetMapsWatcher) {
        targetMapsWatcher[key].update();
      }
    }
  };

  var clearModulesCache = function clearModulesCache(moduleName) {
    return delete modulesCache[moduleName];
  };

  var clearAllCache = function clearAllCache(moduleName) {
    clearModulesCache(moduleName);
    clearStateProxyCache(moduleName); // clearMapsWatcherCache(moduleName);

    clearMapsProxyCache(moduleName);
    clearActionsProxyCache(moduleName);
  };

  var getAllModuleName = function getAllModuleName() {
    if (!allModuleNames) {
      allModuleNames = _toConsumableArray(new Set([].concat(_toConsumableArray(Object.keys(currentModules)), _toConsumableArray(Object.keys(currentLazyModules)))));
    }

    return allModuleNames;
  };

  var runListeners = function runListeners(moduleName) {
    return Array.isArray(listeners[moduleName]) && listeners[moduleName].forEach(function (listener) {
      return listener();
    });
  };

  var _setState = function _setState(moduleName, newState) {
    var stateIsNotChanged = newState === stateProxyCache[moduleName];

    if ((0, _utils.isVoid)(newState) || stateIsNotChanged) {
      return newState;
    }

    var changedStateKeys = (0, _utils.ObjChangedKeys)(currentModules[moduleName].state, newState);

    if (!keysOfModuleStateChangedRecords[moduleName]) {
      keysOfModuleStateChangedRecords[moduleName] = changedStateKeys.keyHasChanged;
    }

    if (changedStateKeys.updatedKeys.length === 0) {
      return;
    }

    currentModules[moduleName].state = newState;
    clearModulesCache(moduleName);
    clearMapsWatcherCache(moduleName, changedStateKeys.updatedKeys);
    runListeners(moduleName);
    return stateProxyCache[moduleName];
  };

  var setState = function setState(moduleName, newState) {
    if ((0, _utils.isPromise)(newState)) {
      return newState.then(function (ns) {
        return Promise.resolve(_setState(moduleName, ns));
      });
    }

    return _setState(moduleName, newState);
  }; // 添加module


  var addModule = function addModule(moduleName, storeModule) {
    if (!!currentModules[moduleName]) {
      console.warn(new Error("addModule: ".concat(moduleName, " already exists!")));
      return currentStoreInstance;
    }

    if (!(0, _utils.isStoreModule)(storeModule)) {
      console.error(new Error('addModule: storeModule is illegal!'));
      return currentStoreInstance;
    }

    currentModules = _objectSpread({}, currentModules, _defineProperty({}, moduleName, replaceModule(moduleName, storeModule)));
    allModuleNames = undefined;
    clearAllCache(moduleName);

    if (!mapsWatcher[moduleName]) {
      mapsWatcher[moduleName] = {};
    }

    if (!stateDepends[moduleName]) {
      stateDepends[moduleName] = {};
    }

    runListeners(moduleName);
    return currentStoreInstance;
  };

  var removeModule = function removeModule(moduleName) {
    delete currentModules[moduleName];
    delete currentLazyModules[moduleName];
    allModuleNames = undefined;
    clearAllCache(moduleName);
    runListeners(moduleName);
    return currentStoreInstance;
  };

  var createStateProxy = function createStateProxy(moduleName) {
    var state = currentModules[moduleName].state;
    var keyHasChanged = keysOfModuleStateChangedRecords[moduleName]; // const stateKeysHasNotChange = ObjHasSameKeys(state, stateProxyCache[moduleName]);

    var stateKeysHasNotChange = keyHasChanged === undefined ? true : !keyHasChanged;

    if (!!stateProxyCache[moduleName] && stateKeysHasNotChange) {
      return stateProxyCache[moduleName];
    }

    var proxyState = {};

    var _loop = function _loop(key) {
      if (state.hasOwnProperty(key)) {
        Object.defineProperty(proxyState, key, {
          enumerable: true,
          configurable: true,
          get: function get() {
            if (_utils.Depend.targetWatcher) {
              if (!stateDepends[moduleName][key]) {
                stateDepends[moduleName][key] = new _utils.Depend(moduleName, key);
              }

              stateDepends[moduleName][key].addWatcher(_utils.Depend.targetWatcher);
            }

            return currentModules[moduleName].state[key];
          }
        });
      }
    };

    for (var key in state) {
      _loop(key);
    }

    stateProxyCache[moduleName] = proxyState;
    keysOfModuleStateChangedRecords[moduleName] = false;
    return proxyState;
  };

  var createMapsProxy = function createMapsProxy(moduleName) {
    var maps = currentModules[moduleName].maps;

    if (maps === undefined) {
      return undefined;
    }

    if (!!mapsProxyCache[moduleName]) {
      return mapsProxyCache[moduleName];
    }

    var proxyMaps = {};

    var _loop2 = function _loop2(key) {
      if (maps.hasOwnProperty(key)) {
        Object.defineProperty(proxyMaps, key, {
          enumerable: true,
          configurable: true,
          get: function get() {
            if (mapsWatcher[moduleName][key] === undefined) {
              mapsWatcher[moduleName][key] = new _utils.Watcher(moduleName, key, function () {
                return currentModules[moduleName].maps[key](stateProxyCache[moduleName]);
              });
            }

            var targetWatcher = mapsWatcher[moduleName][key];

            if (targetWatcher.useCache) {
              return targetWatcher.cache;
            } // 清除旧的依赖


            targetWatcher.clearDepends(); // 重新收集依赖

            targetWatcher.run();
            return targetWatcher.cache;
          }
        });
      }
    };

    for (var key in maps) {
      _loop2(key);
    }

    mapsProxyCache[moduleName] = proxyMaps;
    return proxyMaps;
  };

  var createActionsProxy = function createActionsProxy(moduleName) {
    if (!!actionsProxyCache[moduleName]) {
      return actionsProxyCache[moduleName];
    }

    var actionsProxy = _objectSpread({}, currentModules[moduleName].actions);

    var dispatch = createDispatch(moduleName);
    Object.keys(actionsProxy).forEach(function (key) {
      return actionsProxy[key] = function () {
        for (var _len = arguments.length, data = new Array(_len), _key = 0; _key < _len; _key++) {
          data[_key] = arguments[_key];
        }

        return dispatch.apply(void 0, [key].concat(data));
      };
    });
    actionsProxyCache[moduleName] = actionsProxy;
    return actionsProxy;
  }; // 获取module


  var getModule = function getModule(moduleName) {
    checkModuleIsValid(moduleName);

    if (!!modulesCache[moduleName]) {
      return modulesCache[moduleName];
    }

    var proxyModule = {
      state: createStateProxy(moduleName),
      actions: createActionsProxy(moduleName),
      maps: createMapsProxy(moduleName)
    };
    modulesCache[moduleName] = proxyModule;
    return proxyModule;
  }; // 获取原本的module


  var getOriginModule = function getOriginModule(moduleName) {
    checkModuleIsValid(moduleName);
    return currentModules[moduleName];
  };

  var getLazyModule = function getLazyModule(moduleName) {
    if (!!currentLazyModules[moduleName]) {
      return currentLazyModules[moduleName];
    }

    throw new Error("getLazyModule: ".concat(moduleName, " is not exist"));
  }; // 修改module


  var setModule = function setModule(moduleName, storeModule) {
    if (!(0, _utils.isStoreModule)(storeModule)) {
      console.error(new Error('setModule: storeModule is illegal!'));
      return currentStoreInstance;
    }

    currentModules = _objectSpread({}, currentModules, _defineProperty({}, moduleName, replaceModule(moduleName, storeModule)));
    clearAllCache(moduleName);
    runListeners(moduleName);
    return currentStoreInstance;
  };

  var createDispatch = function createDispatch(moduleName) {
    checkModuleIsValid(moduleName);

    var setStateProxy = function setStateProxy(_ref) {
      var state = _ref.state;
      return setState(moduleName, state);
    };

    var middlewareParams = {
      setState: setStateProxy,
      getState: function getState() {
        return stateProxyCache[moduleName];
      }
    };
    var chain = currentMiddlewares.map(function (middleware) {
      return middleware(middlewareParams);
    });

    var setStateProxyWithMiddleware = _utils.compose.apply(void 0, _toConsumableArray(chain))(setStateProxy);

    return function (type) {
      var _targetModule$actions;

      checkModuleIsValid(moduleName);
      var newState;
      var targetModule = currentModules[moduleName];

      for (var _len2 = arguments.length, data = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        data[_key2 - 1] = arguments[_key2];
      }

      newState = (_targetModule$actions = targetModule.actions)[type].apply(_targetModule$actions, data);
      return setStateProxyWithMiddleware({
        moduleName: moduleName,
        actionName: type,
        state: newState
      });
    };
  };

  var subscribe = function subscribe(moduleName, listener) {
    if (!listeners[moduleName]) {
      listeners[moduleName] = [];
    }

    listeners[moduleName].push(listener);
    return function () {
      return listeners[moduleName] = listeners[moduleName].filter(function (lis) {
        return listener !== lis;
      });
    };
    ;
  };

  var init = function init() {
    Object.keys(modules).forEach(function (moduleName) {
      addModule(moduleName, modules[moduleName]);
    });
  };

  init();
  currentStoreInstance = {
    // createDispatch,
    addModule: addModule,
    getAllModuleName: getAllModuleName,
    getModule: getModule,
    removeModule: removeModule,
    getOriginModule: getOriginModule,
    getLazyModule: getLazyModule,
    setModule: setModule,
    hasModule: hasModule,
    subscribe: subscribe
  };
  return currentStoreInstance;
};

var getStoreInstance = function getStoreInstance() {
  return currentStoreInstance;
};

exports.getStoreInstance = getStoreInstance;
var _default = createStore;
exports["default"] = _default;