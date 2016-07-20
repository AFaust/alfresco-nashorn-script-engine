/* globals -require */
/* globals -define */
/* globals Java: false */
/* globals SimpleLogger: false */
/* globals applicationContext: false */
/* globals load: false */
(function amd()
{
    'use strict';

    var moduleRegistry, moduleManagement, DUMMY_MODULE,
    // core AMD config and backup state
    mappings = {}, packages = {},
    // internal fns
    isObject, normalizeModuleId, withTaggedCaller, getCaller, SecureUseOnlyWrapper,
    // Java utils
    NashornUtils, Throwable, AMDUnavailableModuleException, logger,
    // public fns
    require, define;

    DUMMY_MODULE = {};
    Object.freeze(DUMMY_MODULE);

    NashornUtils = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornUtils');
    Throwable = Java.type('java.lang.Throwable');
    AMDUnavailableModuleException = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.AMDUnavailableModuleException');
    logger = new SimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.amd');

    isObject = function amd__isObject(o)
    {
        var result = o !== undefined && o !== null && Object.prototype.toString.call(o) === '[object Object]';
        return result;
    };

    SecureUseOnlyWrapper = function amd__SecureUseOnlyWrapper_constructor(module, url)
    {
        Object.defineProperty(this, 'wrapped', {
            value : module,
            enumerable : true
        });

        if (typeof url === 'string')
        {
            Object.defineProperty(this, 'url', {
                value : url,
                enumerable : true
            });
        }

        Object.defineProperty(this, 'secureUseOnly', {
            value : true,
            enumerable : true
        });

        Object.freeze(this);

        return this;
    };

    (function amd__normalizeModuleId__init()
    {
        var normalizeSimpleId, AMDUtils;

        AMDUtils = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.AMDUtils');

        normalizeSimpleId = function amd__normalizeSimpleId(id, contextModule)
        {
            var result;

            if (typeof id !== 'string')
            {
                throw new Error('Module ID was either not provided or is not a string');
            }

            result = AMDUtils.normalizeSimpleModuleId(id, isObject(contextModule) ? contextModule.id : null);
            result = AMDUtils.mapModuleId(result, isObject(contextModule) ? contextModule.id : null, mappings);
            logger.trace('Normalized simple id "{}" to "{}"', [ id, result ]);
            return result;
        };

        normalizeModuleId = function amd__normalizeModuleId(id, contextModule, contextUrl, forceIsSecure)
        {
            var loaderName, realId, loader, normalizedId, isSecure, derivativeContextModule;
            if (typeof id !== 'string')
            {
                throw new Error('Module ID was either not provided or is not a string');
            }

            logger.trace('Normalizing module id "{}"', id);

            if (/^[^!]+!.+$/.test(id))
            {
                loaderName = id.substring(0, id.indexOf('!'));
                realId = (id.length >= loaderName.length + 1) ? id.substring(id.indexOf('!') + 1) : '';

                logger.trace('Retrieving loader "{}" for module "{}"', [ loaderName, id ]);

                isSecure = forceIsSecure === true || (isObject(contextModule) && contextModule.secureSource === true);
                loader = moduleManagement.getModule(loaderName, true, isSecure, isObject(contextModule) ? contextModule.url : contextUrl);
                if (loader === undefined || loader === null)
                {
                    throw new Error('No loader plugin named \'' + loaderName + '\' has been registered');
                }

                if (typeof loader.normalize === 'function')
                {
                    logger.trace('Calling normalize-function of loader "{}"', loaderName);
                    // protect against loader manipulating the contextModule by using a derivative
                    if (isObject(contextModule))
                    {
                        derivativeContextModule = Object.create(contextModule, {
                            initialized : {
                                value : contextModule.initialized,
                                enumerable : true
                            },
                            constructing : {
                                value : false,
                                enumerable : true
                            },
                            result : {
                                value : contextModule.result,
                                enumerable : true
                            }
                        });
                    }
                    normalizedId = loaderName + '!' + loader.normalize(realId, normalizeSimpleId, derivativeContextModule);
                }
                else
                {
                    logger.trace('Loader "{}" does not define a normalize-function', loaderName);
                    normalizedId = loaderName + '!' + normalizeSimpleId(realId, contextModule);
                }
            }
            else
            {
                normalizedId = normalizeSimpleId(id, contextModule);
            }

            return normalizedId;
        };
    }());

    /**
     * Immediately resolves a dependency or set of dependencies. This function can be used to get a reference to an already initialized
     * single module by invoking it with just a single string parameter, or to resolve (and implicitly load if necessary) one or more
     * modules with a success and optional failure callback.
     * 
     * @global
     * @param {string|string[]}
     *            dependencies - the dependency/depenendcies that need to be resolved - if this is an array of modules then the callback
     *            variant of this function must be used
     * @param {function}
     *            [callback] - the callback function to execute when the dependencies have been loaded / initialized (arguments will be the
     *            resolved modules in the order of the dependencies array)
     * @param {function}
     *            [errCallback] - the callback function to execute when the dependencies could not be loaded / initialized (signature:
     *            fn(dependencies[], moduleResolutions[], implicitResolutions[])
     */
    require = function amd__require(dependencies, callback, errCallback)
    {
        var idx, args, implicitArgs, normalizedModuleId, module, contextScriptUrl, contextModule, isSecure, failOnMissingDependency, missingModule = false;

        moduleRegistry.initFromSharedState();

        // skip this script to determine script URL of caller
        contextScriptUrl = getCaller();
        contextModule = moduleRegistry.getModuleByUrl(contextScriptUrl);

        isSecure = isObject(contextModule) && contextModule.secureSource === true;

        if (typeof dependencies === 'string')
        {
            logger.trace('Resolving single dependency "{}" for call to require(string)', dependencies);
            // require(string)
            normalizedModuleId = normalizeModuleId(dependencies, contextModule, contextScriptUrl);
            // MUST fail if module is not yet defined or initialised
            module = moduleManagement.getModule(normalizedModuleId, false, isSecure, contextScriptUrl);

            return module;
        }

        if (Array.isArray(dependencies))
        {
            args = [];
            implicitArgs = [];
            failOnMissingDependency = typeof errCallback !== 'function';

            logger.trace('Resolving {} dependencies for call to require(string[], function, function?)', dependencies.length);

            for (idx = 0; idx < dependencies.length; idx += 1)
            {
                logger.trace('Resolving dependency "{}" for call to require(string[], function, function?)', dependencies[0]);
                normalizedModuleId = normalizeModuleId(dependencies[idx], contextModule, contextScriptUrl);

                try
                {
                    module = moduleManagement.getModule(normalizedModuleId, true, isSecure, contextScriptUrl);
                }
                catch (e)
                {
                    module = null;
                    if (e.nashornException instanceof Throwable)
                    {
                        logger.trace('Failed to resolve dependency', e.nashornException);
                    }
                    else
                    {
                        logger.trace('Failed to resolve dependency - {}', e.message);
                    }
                    logger.debug('Failed to resolve dependency "{}" for call to require(string[], function, function?)', dependencies[idx]);

                    // rethrow
                    if (failOnMissingDependency === true || !(e instanceof AMDUnavailableModuleException))
                    {
                        throw e;
                    }
                }

                // TODO Find a way to bind callerScriptUrl context for provided modules to avoid repeated retrievals)
                args.push(module);

                // undefined / null are perfectly valid results of a module factory
                // missingModule only triggers special handling if errCallback has been provided
                if (module === undefined || module === null)
                {
                    logger.trace('Module "{}" in call to require(string[], function, function?) is undefined/null', normalizedModuleId);
                    missingModule = true;
                }

                // only need to track implicit resolutions if we allow reoslution failures
                if (failOnMissingDependency !== true)
                {
                    module = moduleRegistry.getModule(normalizedModuleId);
                    if (isObject(module) && module !== DUMMY_MODULE)
                    {
                        implicitArgs.push(module.implicitResult);
                    }
                    else
                    {
                        implicitArgs.push(undefined);
                    }

                    logger.trace('Added implicit module result "{}" for call to require(string[], function, function?)',
                            implicitArgs[implicitArgs.length - 1]);
                }
            }

            if (missingModule === true && failOnMissingDependency !== true)
            {
                logger.debug('Calling errCallback for call to require(string[], function, function?)');
                // signature is fn(dependencies[], moduleResolutions[], implicitResolutions[])
                errCallback.call(this, dependencies, args, implicitArgs);
            }
            else if (typeof callback === 'function')
            {
                logger.debug('Calling standard callback for call to require(string[], function, function?)');
                callback.apply(this, args);
            }
            else
            {
                throw new Error('No callback was provided');
            }

            return args;
        }
    };

    moduleRegistry = (function amd__moduleRegistry()
    {
        var NashornScriptProcessor, active, backup, internal, result;

        NashornScriptProcessor = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor');

        (function amd__moduleRegistry__initActiveStruct()
        {
            var NashornScriptModel = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModel');

            active = Object.create(Object.prototype, {
                modules : {
                    value : NashornScriptModel.newAssociativeContainer()
                },
                modulesByUrl : {
                    value : NashornScriptModel.newAssociativeContainer()
                },
                moduleListenersByModule : {
                    value : NashornScriptModel.newAssociativeContainer()
                }
            });
        }());

        backup = Object.create(Object.prototype, {
            modules : {
                value : {}
            },
            moduleListenersByModule : {
                value : {}
            }
        });

        internal = Object.create(Object.prototype, {
            initModulesFromSharedState : {
                value : function amd__moduleRegistry__initModulesFromSharedState()
                {
                    var am, amu, bm, moduleIds, moduleInit;

                    am = active.modules;
                    amu = active.modulesByUrl;
                    bm = backup.modules;

                    if (am.length === 0)
                    {
                        logger.debug('Restoring modules from AMD loader shared state');

                        moduleIds = [];
                        moduleInit = function amd__moduleRegistry__initModulesFromSharedState_forEach(moduleId)
                        {
                            var module, backedUpModule, normalizedId;

                            backedUpModule = bm[moduleId];
                            if (isObject(backedUpModule) && !(moduleId in am))
                            {
                                // simply use backup-ed module as prototype
                                // prevent prototype mutation by re-adding mutables locally
                                module = Object.create(backedUpModule, {
                                    initialized : {
                                        value : backedUpModule.initialized,
                                        enumerable : true,
                                        writable : !backedUpModule.initialized
                                    },
                                    constructing : {
                                        value : false,
                                        enumerable : true,
                                        writable : !backedUpModule.initialized
                                    },
                                    result : {
                                        value : backedUpModule.result,
                                        enumerable : true,
                                        writable : !backedUpModule.initialized
                                    }
                                });

                                moduleIds.push(module.id);
                                am[module.id] = module;
                                if (typeof module.url === 'string')
                                {
                                    amu[module.url] = module;
                                }

                                if (typeof module.loader === 'string' && module.id.indexOf(module.loader + '!') !== 0)
                                {
                                    normalizedId = module.loader + '!' + module.id;
                                    am[normalizedId] = module;
                                    moduleIds.push(normalizedId);
                                }
                            }
                        };

                        Object.keys(bm).forEach(moduleInit);
                        logger.trace('Restored registered modules {} from shared state', JSON.stringify(moduleIds));
                    }
                }
            },
            initListenersFromSharedState : {
                value : function amd__moduleRegistry__initListenersFromSharedState()
                {
                    var albm, blbm, initializedListeners, listenerIter, listenerInit;

                    albm = active.moduleListenersByModule;
                    blbm = backup.moduleListenersByModule;

                    if (active.moduleListenersByModule.length === 0)
                    {
                        logger.debug('Restoring module listeners from AMD loader shared state');

                        initializedListeners = {};

                        listenerInit = function amd__moduleRegistry__initListenersFromSharedState_forEach_init(listener, index, arr)
                        {
                            var copiedListener;

                            if (initializedListeners.hasOwnProperty(listener.id))
                            {
                                copiedListener = initializedListeners[listener.id];
                            }

                            if (copiedListener === undefined)
                            {
                                // simply use backup-ed listener as prototype
                                // prevent prototype mutation by re-adding mutables locally
                                copiedListener = Object.create(listener, {
                                    triggered : {
                                        value : listener.triggered,
                                        enumerable : true,
                                        writable : true
                                    },
                                    resolved : {
                                        value : listener.resolved.slice(),
                                        enumerable : true
                                    }
                                });
                                initializedListeners[listener.id] = copiedListener;
                            }

                            arr[index] = copiedListener;
                        };

                        listenerIter = function amd__moduleRegistry__initListenersFromSharedState_forEach(moduleId)
                        {
                            if (Array.isArray(blbm[moduleId]))
                            {
                                // shallow copy array
                                albm[moduleId] = blbm[moduleId].slice();
                                // decouple elements from the backup state
                                albm[moduleId].forEach(listenerInit);
                            }
                        };

                        Object.keys(blbm).forEach(listenerIter);

                        albm['_#dummy#_'] = [];
                    }
                }
            },
            updateSharedStateModules : {
                value : function amd__moduleRegistry__updateSharedStateModules()
                {
                    var moduleId, am, bm, transferredModuleIds;

                    am = active.modules;
                    bm = backup.modules;

                    transferredModuleIds = [];
                    // can't use hasOwnProperty on JSObject am and no prototype exists to inject unwanted/unintended properties
                    /* jshint forin: false */
                    for (moduleId in am)
                    {
                        if (!bm.hasOwnProperty(moduleId) && isObject(am[moduleId]) && am[moduleId] !== DUMMY_MODULE)
                        {
                            bm[moduleId] = am[moduleId];
                            transferredModuleIds.push(moduleId);
                        }

                        delete am[moduleId];
                    }
                    /* jshint forin: true */

                    logger.trace('Transferred registered modules {} to shared state', JSON.stringify(transferredModuleIds));

                    this.initModulesFromSharedState();
                }
            },
            updateSharedStateListeners : {
                value : function amd__moduleRegistry__updateSharedStateListeners()
                {
                    var moduleId, albm, blbm;

                    albm = active.moduleListenersByModule;
                    blbm = backup.moduleListenersByModule;

                    // can't use hasOwnProperty on JSObject albm and no prototype exists to inject unwanted/unintended properties
                    /* jshint forin: false */
                    for (moduleId in albm)
                    {
                        if (Array.isArray(albm[moduleId]))
                        {
                            blbm[moduleId] = albm[moduleId];
                        }

                        delete albm[moduleId];
                    }
                    /* jshint forin: true */

                    this.initListenersFromSharedState();
                }
            }
        });

        result = Object.create(Object.prototype, {

            getModuleListeners : {
                value : function amd__moduleRegistry__getModuleListeners(moduleId)
                {
                    return active.moduleListenersByModule[moduleId] || [];
                }
            },

            addModuleListener : {
                value : function amd__moduleRegistry__addModuleListener(listener)
                {
                    var am, dependencyResolutionCheckHandler, handleDependencies, args, dependencyCollectionHandler, aml, bml;

                    am = active.modules;
                    dependencyResolutionCheckHandler = function amd__moduleRegistry__addModuleListener_dependencyResolutionCheckHandler(
                            dependency)
                    {
                        var module = am[dependency];
                        if (isObject(module) && module !== DUMMY_MODULE
                                && (typeof module.factory === 'function' || (module.result !== undefined && module.result !== null)))
                        {
                            listener.resolved.push(module.id);
                        }
                    };

                    if (listener.dependencies.length === listener.resolved.length)
                    {
                        handleDependencies = function amd__moduleRegistry__addModuleListener_handleDependencies(listener, dependency, idx,
                                arr)
                        {
                            var depModule = moduleManagement.getModule(dependency, true, listener.isSecure, listener.url);
                            arr[idx] = depModule;
                        };

                        args = listener.dependencies.slice();
                        args.forEach(Function.prototype.bind.call(handleDependencies, null, listener));
                        listener.callback.apply(this, args);
                        listener.triggered = true;
                    }

                    if (listener.triggered !== true)
                    {
                        aml = active.moduleListenersByModule;
                        bml = backup.moduleListenersByModule;

                        dependencyCollectionHandler = function amd__moduleRegistry__addModuleListener_dependencyCollectionHandler(
                                dependency)
                        {
                            if (!(dependency in aml))
                            {
                                aml[dependency] = [];

                                if (NashornScriptProcessor.isInEngineContextInitialization())
                                {
                                    bml[dependency] = aml[dependency];
                                }
                            }

                            aml[dependency].push(listener);
                        };

                        listener.dependencies.forEach(dependencyCollectionHandler);
                    }
                }
            },

            getModule : {
                value : function amd__moduleRegistry__getModule(moduleId)
                {
                    return active.modules[moduleId];
                }
            },

            getModuleByUrl : {
                value : function amd__moduleRegistry__getModuleByUrl(moduleUrl)
                {
                    return active.modulesByUrl[moduleUrl];
                }
            },

            addModule : {
                value : function amd__moduleRegistry__addModule(module, moduleId, fullModuleId)
                {
                    var am, amu, bm, moduleIds;

                    am = active.modules;
                    amu = active.modulesByUrl;
                    bm = backup.modules;
                    moduleIds = [];

                    if (typeof moduleId === 'string')
                    {
                        moduleIds.push(moduleId);
                    }

                    if (typeof module.url === 'string')
                    {
                        amu[module.url] = module;
                    }

                    if (typeof fullModuleId === 'string')
                    {
                        moduleIds.push(fullModuleId);
                    }

                    moduleIds.forEach(function(moduleId)
                    {
                        am[moduleId] = module;
                    });

                    // if still in initialisation add to backup
                    if (NashornScriptProcessor.isInEngineContextInitialization())
                    {
                        moduleIds.forEach(function(moduleId)
                        {
                            bm[moduleId] = module;
                        });

                        if (moduleIds.length !== 0)
                        {
                            logger.trace('Transferred newly registered modules {} to shared state', JSON.stringify(moduleIds));
                        }
                    }

                    // either constructible or pre-resolved
                    if (module !== DUMMY_MODULE
                            && (typeof module.factory === 'function' || (module.result !== undefined && module.result !== null)))
                    {
                        this.checkAndFulfillModuleListeners(module);
                    }
                }
            },

            checkAndFulfillModuleListeners : {
                value : function amd__moduleRegistry__checkAndFulfillModuleListeners(module)
                {
                    var listeners, handleListener, handleDependencies;

                    listeners = this.getModuleListeners(module.id);

                    if (Array.isArray(listeners))
                    {
                        handleDependencies = function amd__moduleRegistry__checkAndFulfillModuleListeners_handleDependencies(listener,
                                dependency, idx, arr)
                        {
                            var depModule = moduleManagement.getModule(dependency, true, listener.isSecure, listener.url);
                            arr[idx] = depModule;
                        };

                        handleListener = function amd__moduleRegistry__checkAndFulfillModuleListeners_handleListener(listener)
                        {
                            var args;

                            if (listener.triggered !== true)
                            {
                                listener.resolved.push(module.id);
                                if (listener.dependencies.length === listener.resolved.length)
                                {
                                    args = listener.dependencies.slice();
                                    args.forEach(Function.prototype.bind.call(handleDependencies, null, listener));
                                    listener.callback.apply(this, args);
                                    listener.triggered = true;
                                }
                            }
                        };

                        listeners.forEach(handleListener);
                    }
                }
            },

            initFromSharedState : {
                value : function amd__moduleRegistry__initFromSharedState()
                {
                    internal.initModulesFromSharedState();
                    internal.initListenersFromSharedState();
                }
            },
            updateSharedState : {
                value : function amd__moduleRegistry__updateSharedState()
                {
                    logger.debug('Updating AMD loader shared state');
                    internal.updateSharedStateModules();
                    internal.updateSharedStateListeners();
                }
            }
        });

        Object.freeze(result);

        return result;
    }());

    moduleManagement = (function amd__moduleManagement__init()
    {
        var nashornLoad, defaultScope, URL, internal, result;

        nashornLoad = load;
        defaultScope = this;
        URL = Java.type('java.net.URL');

        internal = Object
                .create(
                        null,
                        {
                            handleModuleLoadFromURL : {
                                value : function amd__moduleManagement__handleModuleLoadFromURL(url, normalizedId, loaderName,
                                        isSecureSource)
                                {
                                    var urlStr, module, customScope, implicitResult;

                                    urlStr = String(url);

                                    module = moduleRegistry.getModuleByUrl(urlStr);
                                    if (isObject(module))
                                    {
                                        if (module.id === normalizedId)
                                        {
                                            throw new Error('Module \'' + normalizedId + '\' in script \'' + urlStr
                                                    + '\' has already been loaded once - it should not have been loaded again');
                                        }

                                        logger.trace('Remapping already loaded module "{}" to "{}" from url "{}"', [ module.id,
                                                normalizedId, url ]);
                                        moduleRegistry.addModule(module, normalizedId);
                                    }
                                    else
                                    {
                                        logger.debug('Loading module "{}" from url "{}" (secureSource: {})', [ normalizedId, url,
                                                isSecureSource === true ]);

                                        // minimal module for URL - just enough for context use
                                        module = Object.create(Object.prototype, {
                                            id : {
                                                value : normalizedId,
                                                enumerable : true
                                            },
                                            url : {
                                                value : urlStr,
                                                enumerable : true
                                            },
                                            loader : {
                                                value : loaderName,
                                                enumerable : true
                                            },
                                            initialized : {
                                                value : false,
                                                enumerable : true
                                            },
                                            constructing : {
                                                value : false,
                                                enumerable : true
                                            },
                                            result : {
                                                value : null,
                                                enumerable : true
                                            },
                                            secureSource : {
                                                value : isSecureSource === true,
                                                enumerable : true
                                            }
                                        });
                                        moduleRegistry.addModule(module);

                                        // we load with custom scope to prevent pollution of the potentially shared global
                                        customScope = Object.create(defaultScope);

                                        withTaggedCaller(function amd__moduleManagement__handleModuleLoadFromURL_nashornLoad()
                                        {
                                            implicitResult = nashornLoad.call(customScope, url);
                                        }, urlStr);

                                        // no module defined yet by requested module id
                                        // may be a non-module script with implicit return value
                                        module = moduleRegistry.getModule(normalizedId);
                                        if (module === null)
                                        {
                                            // script may not define a module
                                            // we store the result of script execution for require(dependencies[], successFn, errorFn)
                                            logger.debug('Module "{}" from url "{}" yielded implicit result "{}"', [ normalizedId, url,
                                                    implicitResult ]);

                                            module = Object.create(Object.prototype, {
                                                id : {
                                                    value : normalizedId,
                                                    enumerable : true
                                                },
                                                loader : {
                                                    value : loaderName,
                                                    enumerable : true
                                                },
                                                url : {
                                                    value : urlStr,
                                                    enumerable : true
                                                },
                                                dependencies : {
                                                    value : [],
                                                    enumerable : true
                                                },
                                                initialized : {
                                                    value : true,
                                                    enumerable : true
                                                },
                                                constructing : {
                                                    value : false,
                                                    enumerable : true
                                                },
                                                result : {
                                                    value : null,
                                                    enumerable : true
                                                },
                                                implicitResult : {
                                                    value : implicitResult,
                                                    enumerable : true
                                                },
                                                secureSource : {
                                                    value : isSecureSource === true,
                                                    enumerable : true
                                                }
                                            });

                                            Object.freeze(module.dependencies);

                                            moduleRegistry.addModule(module, normalizedId);
                                        }
                                    }
                                }
                            },
                            handleModuleLoadPreResolved : {
                                value : function amd__moduleManagement__handleModuleLoadPreResolved(value, normalizedId, loaderName,
                                        isSecureSource, overrideUrl)
                                {
                                    var module;

                                    logger.debug('Registering pre-resolved module "{}"', normalizedId);

                                    module = Object.create(Object.prototype, {
                                        id : {
                                            value : normalizedId,
                                            enumerable : true
                                        },
                                        loader : {
                                            value : loaderName,
                                            enumerable : true
                                        },
                                        url : {
                                            value : typeof overrideUrl === 'string' ? overrideUrl : null,
                                            enumerable : true
                                        },
                                        dependencies : {
                                            value : [],
                                            enumerable : true
                                        },
                                        initialized : {
                                            value : true,
                                            enumerable : true
                                        },
                                        constructing : {
                                            value : false,
                                            enumerable : true
                                        },
                                        result : {
                                            value : value,
                                            enumerable : true
                                        },
                                        secureSource : {
                                            value : isSecureSource === true,
                                            enumerable : true
                                        }
                                    });

                                    Object.freeze(module.dependencies);

                                    moduleRegistry.addModule(module, normalizedId);
                                }
                            },
                            handleModuleLoad : {
                                value : function amd__moduleManagement__handleModuleLoad(value, normalizedId, loaderName, isSecureSource,
                                        overrideUrl)
                                {
                                    if (value !== undefined && value !== null)
                                    {
                                        if (value instanceof URL)
                                        {
                                            this.handleModuleLoadFromURL(value, normalizedId, loaderName, isSecureSource);
                                        }
                                        else
                                        {
                                            this.handleModuleLoadPreResolved(value, normalizedId, loaderName, isSecureSource, overrideUrl);
                                        }
                                    }
                                }
                            },
                            loadModuleViaLoader : {
                                value : function amd__moduleManagement__loadModuleViaLoader(normalizedId, id, loaderName, callerSecure,
                                        callerUrl)
                                {
                                    var loader, loaderModule;

                                    logger.trace('Retrieving loader "{}" for module "{}"', [ loaderName, id ]);

                                    loader = moduleManagement.getModule(loaderName, true, callerSecure, callerUrl);
                                    loaderModule = moduleRegistry.getModule(loaderName);

                                    if (typeof loader.load === 'function')
                                    {
                                        loader.load(id, require,
                                                function amd__moduleManagement__loadModuleViaLoader_explicitLoaderCallback(value,
                                                        isSecureSource, overrideUrl)
                                                {
                                                    if (loaderModule.secureSource === true || isSecureSource === false)
                                                    {
                                                        internal.handleModuleLoad(value, normalizedId, loaderName, isSecureSource,
                                                                overrideUrl);
                                                    }
                                                    else
                                                    {
                                                        throw new Error('Insecure loader module \'' + loaderName
                                                                + '\' cannot declare a loaded module as secure');
                                                    }
                                                });
                                    }
                                    else
                                    {
                                        throw new Error('Module \'' + loaderName + '\' is not a loader plugin');
                                    }
                                }
                            },
                            loadModuleDefinition : {
                                value : function amd__moduleManagement__loadModuleDefinition(normalizedId, doLoad, callerSecure, callerUrl)
                                {
                                    var module;

                                    module = moduleRegistry.getModule(normalizedId);
                                    if (module === null && doLoad)
                                    {
                                        logger.debug('Module "{}" not defined yet - forcing load', normalizedId);

                                        moduleManagement.loadModule(normalizedId, callerSecure, callerUrl);

                                        module = moduleRegistry.getModule(normalizedId);
                                        if (isObject(module))
                                        {
                                            logger.trace('Module "{}" defined by load', normalizedId);
                                        }
                                        else
                                        {
                                            logger.debug('Module "{}" not defined after explicit load', normalizedId);
                                            // avoid repeated loads by caching missed-resolution
                                            moduleRegistry.addModule(DUMMY_MODULE, normalizedId);

                                            throw new AMDUnavailableModuleException('Module \'' + normalizedId
                                                    + '\' has not been defined yet and could not be loaded');
                                        }
                                    }
                                    else if (isObject(module) && module !== DUMMY_MODULE)
                                    {
                                        logger.trace('Module "{}" already defined', normalizedId);
                                    }
                                    else
                                    {
                                        throw new AMDUnavailableModuleException('Module \'' + normalizedId + '\' has not been defined');
                                    }

                                    return module;
                                }
                            },
                            constructModuleResult : {
                                value : function amd__moduleManagement__constructModuleResult(normalizedId, module)
                                {
                                    var moduleResult, isSecure, resolvedDependencies, idx, dependency;

                                    if (typeof module.factory === 'function')
                                    {
                                        logger.debug('Module "{}" not initialised yet - forcing initialisation', normalizedId);

                                        module.constructing = true;
                                        try
                                        {
                                            if (module.dependencies.length === 0)
                                            {
                                                logger.trace('Module "{}" has no dependencies - calling factory', normalizedId);

                                                module.result = module.factory();
                                            }
                                            else
                                            {
                                                isSecure = module.secureSource === true;

                                                logger.trace('Resolving {} dependencies for call to factory of {}', [
                                                        module.dependencies.length, normalizedId ]);
                                                resolvedDependencies = [];
                                                for (idx = 0; idx < module.dependencies.length; idx += 1)
                                                {
                                                    if (module.dependencies[idx] === 'exports')
                                                    {
                                                        logger
                                                                .trace(
                                                                        'Module "{}" uses "exports"-dependency to expose module during initialisation (avoiding circular dependency issues)',
                                                                        normalizedId);
                                                        module.result = {};
                                                        resolvedDependencies.push(module.result);
                                                    }
                                                    else
                                                    {
                                                        logger.debug('Loading dependency "{}" for module "{}"', [ module.dependencies[idx],
                                                                normalizedId ]);

                                                        // TODO Find a way to bind module.url/callerScriptURL context for provided
                                                        // modules to avoid repeated retrievals)
                                                        dependency = moduleManagement.getModule(module.dependencies[idx], true, isSecure,
                                                                module.url);

                                                        resolvedDependencies.push(dependency);
                                                    }
                                                }

                                                logger.trace('All dependencies of module "{}" resolved - calling factory', normalizedId);
                                                if (module.result !== null)
                                                {
                                                    module.factory.apply(this, resolvedDependencies);
                                                }
                                                else
                                                {
                                                    module.result = module.factory.apply(this, resolvedDependencies);
                                                }
                                                logger.trace('Instance/value for module "{}" initialized from factory', normalizedId);
                                            }
                                            module.initialized = true;

                                            // reset
                                            module.constructing = false;
                                        }
                                        catch (e)
                                        {
                                            if (e.nashornException instanceof Throwable)
                                            {
                                                logger.info('Failed to instantiate module', e.nashornException);
                                            }
                                            else
                                            {
                                                logger.info('Failed to instantiate module - {}', e.message);
                                            }

                                            // reset
                                            module.constructing = false;

                                            throw e;
                                        }

                                        moduleResult = module.result;

                                        moduleRegistry.checkAndFulfillModuleListeners(module);
                                    }
                                    else
                                    {
                                        throw new AMDUnavailableModuleException('Module \'' + normalizedId
                                                + '\' could not be loaded (no factory is available)');
                                    }

                                    return moduleResult;
                                }
                            },
                            loadModuleResult : {
                                value : function amd__moduleManagement__loadModuleResult(normalizedId, module, doLoad, callerSecure,
                                        callerUrl)
                                {
                                    var moduleResult;

                                    if (isObject(module) && module !== DUMMY_MODULE)
                                    {
                                        if (module.initialized === true)
                                        {
                                            logger.trace('Module "{}" already initialized', normalizedId);
                                            moduleResult = module.result;

                                            // special case where module was only defined to track implicit return values
                                            // see _load
                                            if (moduleResult === null && module.hasOwnProperty('implicitResult'))
                                            {
                                                throw new AMDUnavailableModuleException('Module \'' + normalizedId
                                                        + '\' could not be loaded');
                                            }
                                        }
                                        else if (doLoad && module.constructing !== true)
                                        {
                                            withTaggedCaller(function amd__moduleManagement__loadModuleResult_construct()
                                            {
                                                moduleResult = internal
                                                        .constructModuleResult(normalizedId, module, callerSecure, callerUrl);
                                            }, callerUrl);
                                        }
                                        else
                                        {
                                            throw new Error('Module \''
                                                    + normalizedId
                                                    + (module.constructing === true ? '\' is included in a circular dependency graph'
                                                            : '\' has not been initialised'));
                                        }
                                    }
                                    else
                                    {
                                        throw new AMDUnavailableModuleException('Module \'' + normalizedId + '\' could not be loaded');
                                    }

                                    return moduleResult;
                                }
                            }
                        });

        result = Object.create(Object.prototype, {
            loadModule : {
                value : function amd__moduleManagement__loadModule(normalizedId, callerSecure, callerUrl)
                {
                    var loaderName, id, idFragments, length, prospectivePackageName, packageConfig;

                    logger.debug('Loading module "{}"', normalizedId);

                    if (/^[^!]+!.+$/.test(normalizedId))
                    {
                        loaderName = normalizedId.substring(0, normalizedId.indexOf('!'));
                        id = normalizedId.substring(normalizedId.indexOf('!') + 1);

                        internal.loadModuleViaLoader(normalizedId, id, loaderName, callerSecure, callerUrl);
                    }
                    else
                    {
                        logger.trace('Resolving module "{}" against configured packages', normalizedId);

                        idFragments = normalizedId.split('/');
                        for (length = idFragments.length - 1; length > 0; length -= 1)
                        {
                            prospectivePackageName = idFragments.slice(0, length).join('/');
                            if (packages.hasOwnProperty(prospectivePackageName))
                            {
                                packageConfig = packages[prospectivePackageName];
                                break;
                            }
                        }

                        if (isObject(packageConfig))
                        {
                            loaderName = packageConfig.loader;
                            id = idFragments.slice(length).join('/');
                            if (packageConfig.hasOwnProperty('location'))
                            {
                                id = packageConfig.location + '/' + id;
                            }

                            internal.loadModuleViaLoader(normalizedId, id, loaderName, callerSecure, callerUrl);
                        }
                        else
                        {
                            throw new Error('Module \'' + normalizedId + '\' does not belong to any configured package - unable to load');
                        }
                    }
                }
            },
            getModule : {
                value : function amd__moduleManagement__getModule(normalizedId, doLoad, callerSecure, callerUrl)
                {
                    var module, moduleResult;
                    logger.debug('Retrieving module "{}" (force load: {})', [ normalizedId, doLoad ]);

                    module = internal.loadModuleDefinition(normalizedId, doLoad, callerSecure, callerUrl);
                    moduleResult = internal.loadModuleResult(normalizedId, module, doLoad, callerSecure, callerUrl);

                    // TODO Refactor with check for wrapper (when we have introduced the generic module result wrapper)
                    if (callerSecure !== true && isObject(moduleResult) && ('secureUseOnly' in moduleResult)
                            && moduleResult.secureUseOnly === true)
                    {
                        throw new Error('Access to module \'' + normalizedId + '\' is not allowed for unsecure caller \'' + callerUrl
                                + '\'');
                    }

                    if (moduleResult instanceof SecureUseOnlyWrapper)
                    {
                        moduleResult = moduleResult.wrapped;
                    }

                    return moduleResult;
                }
            }
        });

        return result;
    }.call(this));

    (function amd__require__whenAvailable__init()
    {
        var UUID = Java.type('java.util.UUID');

        require.whenAvailable = function amd__require__whenAvailable(dependencies, callback)
        {
            var normalizedModuleId, contextScriptUrl, contextModule, isSecure, listener, idx;

            if (callback === undefined || callback === null)
            {
                throw new Error('No callback provided');
            }

            if (typeof callback !== 'function')
            {
                throw new Error('Callback is not a function');
            }

            moduleRegistry.initFromSharedState();

            // skip this script to determine script URL of caller
            contextScriptUrl = getCaller();
            contextModule = moduleRegistry.getModuleByUrl(contextScriptUrl);

            isSecure = isObject(contextModule) && contextModule.secureSource === true;

            listener = Object.create(Object.prototype, {
                // just internal identifier
                id : {
                    value : UUID.randomUUID().toString()
                },
                isSecure : {
                    value : isSecure,
                    enumerable : true
                },
                url : {
                    value : contextScriptUrl,
                    enumerable : true
                },
                callback : {
                    value : callback,
                    enumerable : true
                },
                resolved : {
                    value : [],
                    enumerable : true
                },
                dependencies : {
                    value : [],
                    enumerable : true
                },
                triggered : {
                    value : false,
                    enumerable : true,
                    writable : true
                }
            });

            if (typeof dependencies === 'string')
            {
                normalizedModuleId = normalizeModuleId(dependencies, contextModule, contextScriptUrl);
                listener.dependencies.push(normalizedModuleId);
            }
            else if (Array.isArray(dependencies))
            {
                for (idx = 0; idx < dependencies.length; idx += 1)
                {
                    normalizedModuleId = normalizeModuleId(dependencies[idx], contextModule, contextScriptUrl);
                    listener.dependencies.push(normalizedModuleId);
                }
            }
            else
            {
                throw new Error('Invalid dependencies');
            }

            Object.freeze(listener.dependencies);

            if (logger.traceEnabled)
            {
                logger.trace('Registered listener from url "{}" (secureSource: {}) for modules {}', [ contextScriptUrl, isSecure,
                        JSON.stringify(listener.dependencies) ]);
            }
            else
            {
                logger.trace('Registered listener from url "{}" (secureSource: {})', [ contextScriptUrl, isSecure ]);
            }

            moduleRegistry.addModuleListener(listener);
        };
    }());

    require.config = function amd__require_config(config)
    {
        var configKeyFn, packageFn, mapFn;

        if (!isObject(config))
        {
            throw new Error('Invalid config parameter');
        }

        if (logger.traceEnabled)
        {
            logger.trace('Configuring AMD loader with config "{}"', JSON.stringify(config));
        }
        else
        {
            logger.debug('Configuring AMD loader');
        }

        configKeyFn = function amd__require_config_key(key)
        {
            var packageConfigs;

            switch (key)
            {
                case 'packages':
                    logger.debug('Configuring AMD packages');
                    packageConfigs = config[key];

                    if (Array.isArray(packageConfigs))
                    {
                        packageConfigs.forEach(packageFn, this);
                    }
                    break;
                case 'map':
                    logger.debug('Configuring AMD mapppings');
                    if (isObject(config[key]))
                    {
                        mapFn.call(this, config[key]);
                    }
                    break;
                default:
                    logger.warn('Ignoring unsupported AMD loader option "{}"', key);
                    // unsupported option - ignore silently
            }
        };

        mapFn = function amd__require_config_key_map(map)
        {
            Object.keys(map).forEach(function amd__require_config_key_map_sourcePrefix(sourcePrefix)
            {
                // stringify + parse for efficient clone
                mappings[sourcePrefix] = JSON.parse(JSON.stringify(map[sourcePrefix]));
            }, this);
        };

        packageFn = function amd__require_config_key_packages(singlePackageConfig)
        {
            var packName, packLoader, packLocation;
            if (!isObject(singlePackageConfig))
            {
                throw new Error('Invalid package config structure');
            }

            packName = singlePackageConfig.name || null;
            packLoader = singlePackageConfig.loader || null;
            packLocation = singlePackageConfig.location || null;

            if (packName === null || typeof packName !== 'string' || !(/^(?:\w|[\-_.])+(?:\/(?:\w|[\-_.])+)*$/.test(packName)))
            {
                throw new Error('Package name has not been set or is not a valid string');
            }

            if (packages.hasOwnProperty(packName))
            {
                // should not occur due to one-shot operation
                throw new Error('Package \'' + packName + '\' has already been defined');
            }

            if (packLoader === null || typeof packLoader !== 'string' || !(/^(?:\w|[\-_.])+(?:\/(?:\w|[\-_.])+)*$/.test(packLoader)))
            {
                throw new Error('Loader name for package \'' + packName + '\' has not been set or is not a valid string');
            }

            logger.trace('Adding AMD package "{}" using loader "{}" (package location: {})', [ packName, packLoader, packLocation ]);

            packages[packName] = {
                name : packName,
                loader : packLoader
            };

            if (packLocation !== null && typeof packLocation === 'string')
            {
                // TODO Can we relax this? Location is intended to be a virtual prefix to the module ID, so it
                // needs to conform to same rules we apply on packLoader as module ID
                if (!(/^(?:\w|[\-_.])+(?:\/(?:\w|[\-_.])+)*$/.test(packLocation)))
                {
                    throw new Error('Location for for package \'' + packName + '\' is not a valid string');
                }
                packages[packName].location = packLocation;
            }
        };

        try
        {
            Object.keys(config).forEach(configKeyFn, this);
        }
        catch (e)
        {
            if (e.nashornException instanceof Throwable)
            {
                logger.warn('Failed to configure AMD loader', e.nashornException);
            }
            else
            {
                logger.warn('Failed to configure AMD loader - {}', e.message);
            }
            // reset to preserve pristine state
            packages = {};
            throw e;
        }

        // config is a one-shot operation and finalizes AMD framework
        // remove option for further config
        delete require.config;
        Object.freeze(require);

        moduleRegistry.updateSharedState();
    };

    (function amd__callerTagging__init()
    {
        var NashornScriptModel, executionState, getRestoreTaggedCallerFn;

        NashornScriptModel = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModel');
        executionState = NashornScriptModel.newAssociativeContainer();

        getRestoreTaggedCallerFn = function amd__callerTagging__getRestoreTaggedCallerFn(scriptUrl)
        {
            var originalScriptUrl = scriptUrl;

            return function amd__require_tagCallerScript_restoreFn()
            {
                executionState.taggedCallerScriptUrl = originalScriptUrl;
                logger.debug('Tagged script caller reset to {}', originalScriptUrl);
            };
        };

        require.isSecureCallerScript = function amd__require__isSecureCallerScript(suppressTaggedCaller)
        {
            var amdScriptUrl, baseUrl, contextScriptUrl, contextModule, isSecure;

            // skip this and the caller script to determine script URL of callers caller
            if (suppressTaggedCaller === true)
            {
                contextScriptUrl = NashornUtils.getCallerScriptURL(2, true);
            }
            else
            {
                contextScriptUrl = executionState.taggedCallerScriptUrl || NashornUtils.getCallerScriptURL(2, true);
            }
            contextModule = moduleRegistry.getModuleByUrl(contextScriptUrl);

            if (isObject(contextModule))
            {
                isSecure = contextModule.secureSource === true;
            }
            else
            {
                // no module = insecure by default unless caller is from this script package
                amdScriptUrl = NashornUtils.getCallerScriptURL(false, false);
                baseUrl = amdScriptUrl.substring(0, amdScriptUrl.length - 'amd.js'.length);
                isSecure = contextScriptUrl.substring(0, baseUrl.length) === baseUrl;
            }

            logger.trace('Determined script "{}" to be secure: {}', [ contextScriptUrl, isSecure ]);

            return isSecure;
        };

        require.getCallerScriptURL = function amd__require__getCallerScriptURL(suppressTaggedCaller)
        {
            var contextScriptUrl;

            // skip this and the caller script to determine script URL of callers caller
            if (suppressTaggedCaller === true)
            {
                contextScriptUrl = NashornUtils.getCallerScriptURL(2, true);
            }
            else
            {
                contextScriptUrl = executionState.taggedCallerScriptUrl || NashornUtils.getCallerScriptURL(2, true);
            }

            return contextScriptUrl;
        };

        require.getCallerScriptModuleId = function amd__require__getCallerScriptModuleId(suppressTaggedCaller)
        {
            var contextScriptUrl, contextModule, moduleId;

            if (suppressTaggedCaller === true)
            {
                contextScriptUrl = NashornUtils.getCallerScriptURL(2, true);
            }
            else
            {
                contextScriptUrl = executionState.taggedCallerScriptUrl || NashornUtils.getCallerScriptURL(2, true);
            }
            contextModule = moduleRegistry.getModuleByUrl(contextScriptUrl);

            if (isObject(contextModule))
            {
                moduleId = contextModule.id;

                if (moduleId.indexOf(contextModule.loader + '!') === 0)
                {
                    moduleId = moduleId.substring(moduleId.indexOf('!') + 1);
                }
            }

            return moduleId;
        };

        require.getCallerScriptModuleLoader = function amd__require__getCallerScriptModuleLoader(suppressTaggedCaller)
        {
            var contextScriptUrl, contextModule, moduleLoader;

            if (suppressTaggedCaller === true)
            {
                contextScriptUrl = NashornUtils.getCallerScriptURL(2, true);
            }
            else
            {
                contextScriptUrl = executionState.taggedCallerScriptUrl || NashornUtils.getCallerScriptURL(2, true);
            }
            contextModule = moduleRegistry.getModuleByUrl(contextScriptUrl);

            if (isObject(contextModule))
            {
                moduleLoader = contextModule.loader;
            }

            return moduleLoader;
        };

        /**
         * Tags the current execution context with a fixed caller script URL. The script URL is determined from the current stack and
         * excludes both the script of this operation as well as the immediate caller.
         * 
         * @instance
         * @memberof require
         * @param {boolean}
         *            [untaggedOnly] - flag if the execution context should only be tagged if not already tagged at the time of the call
         * @returns {function} a callback to restore the execution context to its previous state
         */
        require.tagCallerScript = function amd__require__tagCallerScript(untaggedOnly)
        {
            var restoreFn, contextScriptUrl;

            restoreFn = getRestoreTaggedCallerFn(executionState.taggedCallerScriptUrl);
            if (untaggedOnly === true)
            {
                contextScriptUrl = executionState.taggedCallerScriptUrl || NashornUtils.getCallerScriptURL(2, true);
            }
            else
            {
                contextScriptUrl = NashornUtils.getCallerScriptURL(2, true);
            }
            executionState.taggedCallerScriptUrl = contextScriptUrl;

            logger.debug('Caller script tagged as "{}"', contextScriptUrl);

            return restoreFn;
        };

        /**
         * Executes a callback with a fixed caller script URL tagged in the current execution context. The script URL is determined from the
         * current stack and excludes both the script of this operation as well as the immediate caller.
         * 
         * @instance
         * @memberof require
         * @param {function}
         *            callback - the callback to execute
         * @param {boolean}
         *            [untaggedOnly] - flag if the execution context should only be tagged if not already tagged at the time of the call
         */
        require.withTaggedCallerScript = function amd__require__withTaggedCallerScript(callback, untaggedOnly)
        {
            var result, restoreFn, contextScriptUrl;

            if (typeof callback === 'function')
            {
                restoreFn = getRestoreTaggedCallerFn(executionState.taggedCallerScriptUrl);
                if (untaggedOnly === true)
                {
                    contextScriptUrl = executionState.taggedCallerScriptUrl || NashornUtils.getCallerScriptURL(2, true);
                }
                else
                {
                    contextScriptUrl = NashornUtils.getCallerScriptURL(2, true);
                }
                executionState.taggedCallerScriptUrl = contextScriptUrl;

                logger.debug('Executing function "{}" with tagged script caller "{}"', [ callback.name, contextScriptUrl ]);

                try
                {
                    result = callback();

                    restoreFn();
                }
                catch (e)
                {
                    restoreFn();

                    throw e;
                }
            }
            else
            {
                logger.info('Attempted to execute function with a tagged caller script URL, but provided no callback function to execute');
            }

            return result;
        };

        getCaller = function amd__require__getCallerScriptURL_internal()
        {
            var contextScriptUrl = executionState.taggedCallerScriptUrl || NashornUtils.getCallerScriptURL(true, true);
            return contextScriptUrl;
        };

        withTaggedCaller = function amd__require__withTaggedCallerScript_internal(callback, callerScriptUrl)
        {
            var result, restoreFn;

            restoreFn = getRestoreTaggedCallerFn(executionState.taggedCallerScriptUrl);
            executionState.taggedCallerScriptUrl = callerScriptUrl;

            logger.debug('Executing function "{}" with tagged script caller "{}"', [ callback.name, callerScriptUrl ]);

            try
            {
                result = callback();

                restoreFn();
            }
            catch (e)
            {
                restoreFn();

                throw e;
            }

            return result;
        };
    }());

    /**
     * Defines a new module that can then be requested / required from client code or other modules.
     * 
     * @global
     * @param {string}
     *            [moduleId] - the ID of the module being defined - if this parameter is not provided the define function will try to derive
     *            an implicit ID from the current execution context (e.g. references used to load the currently executed script file)
     * @param {string[]}
     *            [dependencies] - the list of module dependencies for the module to be defined
     * @param {function}
     *            factory - the factory callback to construct the module if it is requested / required
     */
    define = function amd__define()
    {
        var id, normalizedId, dependencies, factory, idx, contextScriptUrl, contextModule, module;

        moduleRegistry.initFromSharedState();

        contextScriptUrl = getCaller();
        contextModule = moduleRegistry.getModuleByUrl(contextScriptUrl);

        for (idx = 0; idx < arguments.length; idx += 1)
        {
            if (idx === 0 && typeof arguments[idx] === 'string')
            {
                id = arguments[idx];
            }

            if (idx < 2 && dependencies === undefined && factory === undefined && Array.isArray(arguments[idx]))
            {
                dependencies = arguments[idx];
            }

            if (idx < 3 && factory === undefined && typeof arguments[idx] === 'function')
            {
                factory = arguments[idx];
            }
        }

        if (isObject(contextModule))
        {
            if (id === undefined)
            {
                id = contextModule.id;
            }

            if (typeof contextModule.loader === 'string' && id.indexOf(contextModule.loader + '!') !== 0)
            {
                normalizedId = contextModule.loader + '!' + id;
            }
        }

        if (dependencies === undefined)
        {
            // we don't default to standard dependencies of CommonJS (["require", "exports", "module"})
            dependencies = [];
        }

        for (idx = 0; idx < dependencies.length; idx += 1)
        {
            if (typeof dependencies[idx] !== 'string')
            {
                throw new Error('Dependency identifier is not a string');
            }

            dependencies[idx] = normalizeModuleId(dependencies[idx], contextModule, contextScriptUrl);
        }

        if (id === undefined || id === null)
        {
            throw new Error('Module id could not be infered');
        }

        if (factory === undefined || factory === null)
        {
            throw new Error('Module factory was not provided');
        }

        if (logger.traceEnabled)
        {
            logger.trace('Defining module "{}" from url "{}" with dependencies {} (secureSource: {})', [ id, contextScriptUrl,
                    JSON.stringify(dependencies), isObject(contextModule) ? contextModule.secureSource : false ]);
        }
        else
        {
            logger.debug('Defining module "{}" from url "{}" (secureSource: {})', [ id, contextScriptUrl,
                    isObject(contextModule) ? contextModule.secureSource : false ]);
        }

        module = Object.create(Object.prototype, {
            id : {
                value : id,
                enumerable : true
            },
            loader : {
                value : (isObject(contextModule) ? contextModule.loader : null),
                enumerable : true
            },
            url : {
                value : contextScriptUrl,
                enumerable : true
            },
            dependencies : {
                value : dependencies,
                enumerable : true
            },
            factory : {
                value : factory,
                enumerable : true
            },
            initialized : {
                value : false,
                enumerable : true,
                writable : true
            },
            constructing : {
                value : false,
                enumerable : true,
                writable : true
            },
            result : {
                value : null,
                enumerable : true,
                writable : true
            },
            secureSource : {
                value : (isObject(contextModule) ? contextModule.secureSource : false),
                enumerable : true
            }
        });

        Object.freeze(dependencies);

        moduleRegistry.addModule(module, id, normalizedId);
    };

    // TODO Expand into a generic "asModule" supporting modifiers such as "secureUse", "clientModuleAware"...
    define.asSecureUseModule = function amd__define_asSecureUseModule(module, url)
    {
        return new SecureUseOnlyWrapper(module, url);
    };

    /**
     * Preloads a specific module in such a way that its defining script file is loaded to ensure that the module is defined. This operation
     * will not cause any module factory to be called.
     * 
     * @instance
     * @memberof define
     * @param {string}
     *            moduleId - the ID of the module to preload
     * @param {string}
     *            [aliasModuleId] - an alternative ID of the module to be used to lookup / initialize the module after load (in case the
     *            moduleId is used to load a module which specifies a different module ID in its call to define)
     */
    define.preload = function amd__define_preload(moduleId, aliasModuleId)
    {
        var normalizedModuleId, module;

        moduleRegistry.initFromSharedState();

        if (moduleId === undefined || moduleId === null)
        {
            throw new Error('Module id was not provided');
        }

        if (typeof moduleId === 'string')
        {
            normalizedModuleId = normalizeModuleId(moduleId, null, null, true);

            module = moduleRegistry.getModule(normalizedModuleId);
            if (!isObject(module) || module === DUMMY_MODULE)
            {
                logger.debug('Pre-loading module "{}"', normalizedModuleId);
                moduleManagement.loadModule(normalizedModuleId, true);

                // if it a module has been registered with the expected name initialize it too
                // check for provided aliasModuleId first
                if (typeof aliasModuleId === 'string')
                {
                    normalizedModuleId = normalizeModuleId(aliasModuleId);
                }

                module = moduleRegistry.getModule(normalizedModuleId);
                if (isObject(module) && module !== DUMMY_MODULE && typeof module.factory === 'function')
                {
                    moduleManagement.getModule(normalizedModuleId, true, true);
                }
            }
        }
        else
        {
            throw new Error('Module id is not a string');
        }
    };

    // mininum object to identify define as AMD compatible
    define.amd = {};

    // freeze all the things
    Object.freeze(require.whenAvailable);
    Object.freeze(require.isSecureCallerScript);
    Object.freeze(require.getCallerScriptModuleId);
    Object.freeze(require.getCallerScriptModuleLoader);
    Object.freeze(require.getCallerScriptURL);
    Object.freeze(require.tagCallerScript);
    Object.freeze(require.withTaggedCallerScript);
    // require / require.config can't be frozen yet
    Object.freeze(define.asSecureUseModule);
    Object.freeze(define.preload);
    Object.freeze(define.amd);
    Object.freeze(define);

    (function amd__loaderMetaloader__init()
    {
        var URL, streamHandler, loaderMetaLoader;

        // need to select specific constructor to override basePath
        URL = Java.type('java.net.URL');
        // applicationContext only set during engine setup
        streamHandler = applicationContext ? applicationContext.getBean('de.axelfaust.alfresco.nashorn.repo-classpathURLStreamHandler')
                : null;

        if (streamHandler === null)
        {
            streamHandler = (function()
            {
                var AlfrescoClasspathURLStreamHandler;

                AlfrescoClasspathURLStreamHandler = Java
                        .type('de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLStreamHandler');
                streamHandler = new AlfrescoClasspathURLStreamHandler();
                streamHandler.basePath = 'alfresco';
                streamHandler.extensionPath = 'extension';

                return streamHandler;
            }());
        }

        /**
         * This loader module provides the ability to bootstrap / load the other core module loaders of the Nashorn script engine AMD
         * framework.
         * 
         * @module loaderMetaLoader
         * @author Axel Faust
         */
        loaderMetaLoader = {
            /**
             * Loads a core module loader from the classpath location de/axelfaust/alfresco/nashorn/repo/loaders without any support for
             * overriding via Alfresco extension paths.
             * 
             * @instance
             * @param {string}
             *            normalizedId - the normalized ID of the module to load
             * @param {function}
             *            require - the context-sensitive require function
             * @param {function}
             *            load - the callback to load either a pre-built object as the module result or a script defining a module from a
             *            script URL
             */
            load : function amd__loaderMetaLoader__load(normalizedId, /* jshint unused: false */require, load)
            {
                var url = new URL('raw-classpath', null, -1, 'de/axelfaust/alfresco/nashorn/repo/loaders/' + normalizedId, streamHandler);

                logger.debug('Loading loader module {} from classpath', normalizedId);

                load(url, true);
            }
        };
        Object.freeze(loaderMetaLoader.load);
        Object.freeze(loaderMetaLoader);
        moduleRegistry.addModule(Object.create(Object.prototype, {
            id : {
                value : 'loaderMetaLoader',
                enumerable : true
            },
            url : {
                value : NashornUtils.getCallerScriptURL(false, false),
                enumerable : true
            },
            initialized : {
                value : true,
                enumerable : true
            },
            constructing : {
                value : false,
                enumerable : true
            },
            result : {
                value : loaderMetaLoader,
                enumerable : true
            },
            secureSource : {
                value : true,
                enumerable : true
            }
        }), 'loaderMetaLoader');
    }());

    // TODO Turn require module into reference-aware require-only (incl caller tagging based on referencing module)
    moduleRegistry.addModule(Object.create(Object.prototype, {
        id : {
            value : 'require',
            enumerable : true
        },
        url : {
            value : NashornUtils.getCallerScriptURL(false, false),
            enumerable : true
        },
        initialized : {
            value : true,
            enumerable : true
        },
        constructing : {
            value : false,
            enumerable : true
        },
        result : {
            value : require,
            enumerable : true
        },
        secureSource : {
            value : true,
            enumerable : true
        }
    }), 'require');

    // TODO Turn define module into reference-aware define-only (incl caller tagging based on referencing module)
    moduleRegistry.addModule(Object.create(Object.prototype, {
        id : {
            value : 'define',
            enumerable : true
        },
        url : {
            value : NashornUtils.getCallerScriptURL(false, false),
            enumerable : true
        },
        initialized : {
            value : true,
            enumerable : true
        },
        constructing : {
            value : false,
            enumerable : true
        },
        result : {
            value : define,
            enumerable : true
        },
        secureSource : {
            value : true,
            enumerable : true
        }
    }), 'define');

    Object.defineProperty(this, 'require', {
        value : require,
        enumerable : false
    });

    Object.defineProperty(this, 'define', {
        value : define,
        enumerable : false
    });
}.call(this));