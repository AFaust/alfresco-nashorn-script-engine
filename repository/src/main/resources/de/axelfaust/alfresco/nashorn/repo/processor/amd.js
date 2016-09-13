/* globals -require */
/* globals -define */
/* globals Java: false */
/* globals JSAdapter: false */
/* globals getSimpleLogger: false */
/* globals applicationContext: false */
/* globals load: false */
(function amd()
{
    'use strict';

    var moduleRegistry, moduleManagement, DUMMY_MODULE,
    // core AMD config and backup state
    mappings = {}, packages = {},
    // internal fns
    isObject, normalizeModuleId, withTaggedCaller, getCaller, SpecialModuleWrapper,
    // Java utils
    NashornUtils, Throwable, AMDUnavailableModuleException, commonLogger, requireLogger, defineLogger, callerLogger,
    // public fns
    require, define;

    DUMMY_MODULE = {};
    Object.freeze(DUMMY_MODULE);

    NashornUtils = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornUtils');
    Throwable = Java.type('java.lang.Throwable');
    AMDUnavailableModuleException = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.AMDUnavailableModuleException');

    commonLogger = getSimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.amd.common');
    requireLogger = getSimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.amd.require');
    defineLogger = getSimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.amd.define');
    callerLogger = getSimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.amd.caller');

    isObject = function amd__isObject(o)
    {
        var result = o !== undefined && o !== null && Object.prototype.toString.call(o) === '[object Object]';
        return result;
    };

    SpecialModuleWrapper = function amd__SpecialModuleWrapper_constructor(module)
    {
        Object.defineProperties(this, {
            wrapped : {
                value : module,
                enumerable : true
            },
            callerTagged : {
                value : false,
                enumerable : true,
                writable : true
            },
            callerProvided : {
                value : false,
                enumerable : true,
                writable : true
            },
            secureUseOnly : {
                value : false,
                enumerable : true,
                writable : true
            }
        });

        Object.seal(this);

        return this;
    };
    SpecialModuleWrapper.prototype = Object.create(Object.prototype);
    SpecialModuleWrapper.prototype.constructor = SpecialModuleWrapper;

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
            if (commonLogger.traceEnabled)
            {
                commonLogger.trace('Normalized simple id {} to {}', id, result);
            }
            return result;
        };

        normalizeModuleId = function amd__normalizeModuleId(id, contextModule, contextUrl, forceIsSecure)
        {
            var loaderName, realId, loader, normalizedId, isSecure, derivativeContextModule;
            if (typeof id !== 'string')
            {
                throw new Error('Module ID was either not provided or is not a string');
            }

            if (commonLogger.traceEnabled)
            {
                commonLogger.trace('Normalizing module id {}', id);
            }

            if (/^[^!]+!.+$/.test(id))
            {
                loaderName = id.substring(0, id.indexOf('!'));
                realId = (id.length >= loaderName.length + 1) ? id.substring(id.indexOf('!') + 1) : '';

                if (commonLogger.traceEnabled)
                {
                    commonLogger.trace('Retrieving loader {} for module {}', loaderName, id);
                }

                isSecure = forceIsSecure === true || (isObject(contextModule) && contextModule.secureSource === true);
                loader = moduleManagement.getModule(loaderName, true, isSecure, isObject(contextModule) ? contextModule.url : contextUrl);
                if (loader === undefined || loader === null)
                {
                    throw new Error('No loader plugin named \'' + loaderName + '\' has been registered');
                }

                if (typeof loader.normalize === 'function')
                {
                    if (commonLogger.traceEnabled)
                    {
                        commonLogger.trace('Calling normalize-function of loader {}', loaderName);
                    }
                    // protect against loader manipulating the contextModule by
                    // using a derivative
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
                    if (commonLogger.traceEnabled)
                    {
                        commonLogger.trace('Loader {} does not define a normalize-function', loaderName);
                    }
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
     * The callback for successfull resolution of modules via the
     * {@link require} function.
     * 
     * @callback requireResolutionCallback
     * @param {...object}
     *            module - the resolved module in the order of the dependencies
     *            list
     */

    /**
     * The callback for failed resolutions of modules via the {@link require}
     * function.
     * 
     * @callback requireResolutionErrorCallback
     * @param {string[]}
     *            dependencies - the list of dependencies requested
     * @param {object[]}
     *            modules - the list of resolved modules in the order of the
     *            dependencies list
     * @param {object[]}
     *            implicitResults - the list of implicit return values from
     *            loading the module script files, even if files did not define
     *            an actual module (in the order of the dependencies list)
     */

    /**
     * Immediately resolves a dependency or set of dependencies. This function
     * can be used to get a reference to an already initialized single module by
     * invoking it with just a single string parameter, or to resolve (and
     * implicitly load if necessary) one or more modules with a success and
     * optional failure callback.
     * 
     * @global
     * @param {string|string[]}
     *            dependencies - the dependency/depenendcies that need to be
     *            resolved - if this is an array of modules then the callback
     *            variant of this function must be used
     * @param {requireResolutionCallback}
     *            [callback] - the callback function to execute when the
     *            dependencies have been loaded / initialized
     * @param {requireResolutionErrorCallback}
     *            [errCallback] - the callback function to execute when the
     *            dependencies could not be loaded / initialized
     */
    require = function amd__require(dependencies, callback, errCallback)
    {
        var contextScriptUrl, contextModule, isSecure, normalizedModuleId, module, args, implicitArgs, failOnMissingDependency, missingModule = false, result;

        // skip this script to determine script URL of caller
        contextScriptUrl = getCaller();
        contextModule = moduleRegistry.getModuleByUrl(contextScriptUrl);

        isSecure = isObject(contextModule) && contextModule.secureSource === true;

        if (typeof dependencies === 'string')
        {
            if (requireLogger.debugEnabled)
            {
                requireLogger.debug('Resolving single dependency {} for call to require(string)', dependencies);
            }
            // require(string)
            normalizedModuleId = normalizeModuleId(dependencies, contextModule, contextScriptUrl);

            try
            {
                // MUST fail if module is not yet defined or initialised
                module = moduleManagement.getModule(normalizedModuleId, false, isSecure, contextScriptUrl);
            }
            catch (e)
            {
                if (requireLogger.debugEnabled)
                {
                    if (e.nashornException instanceof Throwable)
                    {
                        requireLogger
                                .debug('Failed to resolve dependency {} for call to require(string)', dependencies, e.nashornException);
                    }
                    else
                    {
                        requireLogger.debug('Failed to resolve dependency {} for call to require(string) - {}', dependencies, e.message);
                    }
                }

                throw e;
            }

            return module;
        }

        if (Array.isArray(dependencies))
        {
            args = [];
            implicitArgs = [];
            failOnMissingDependency = typeof errCallback !== 'function';

            if (requireLogger.debugEnabled)
            {
                requireLogger.debug('Resolving {} dependencies for call to require(string[], function, function?)', dependencies.length);
            }

            dependencies.forEach(function amd__require_forEachDependency(dependency)
            {
                if (requireLogger.traceEnabled)
                {
                    requireLogger.trace('Resolving dependency {} for call to require(string[], function, function?)', dependency);
                }

                normalizedModuleId = normalizeModuleId(dependency, contextModule, contextScriptUrl);

                try
                {
                    module = moduleManagement.getModule(normalizedModuleId, true, isSecure, contextScriptUrl);
                }
                catch (e)
                {
                    module = null;
                    if (requireLogger.debugEnabled)
                    {
                        if (e.nashornException instanceof Throwable)
                        {
                            requireLogger.debug('Failed to resolve dependency {} for call to require(string[], function, function?)',
                                    dependency, e.nashornException);
                        }
                        else
                        {
                            requireLogger.debug('Failed to resolve dependency {} for call to require(string[], function, function?) - {}',
                                    dependency, e.message);
                        }
                    }

                    // rethrow
                    if (failOnMissingDependency === true || !(e instanceof AMDUnavailableModuleException))
                    {
                        throw e;
                    }
                }

                args.push(module);

                // undefined / null are perfectly valid results of a module
                // factory
                // missingModule only triggers special handling if errCallback
                // has been provided
                if (module === undefined || module === null)
                {
                    if (requireLogger.traceEnabled)
                    {
                        requireLogger.trace('Module {} in call to require(string[], function, function?) is undefined/null',
                                normalizedModuleId);
                    }
                    missingModule = true;
                }

                // only need to track implicit resolutions if we allow
                // reoslution failures
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

                    if (requireLogger.traceEnabled)
                    {
                        requireLogger.trace('Added implicit module result {} for call to require(string[], function, function?)',
                                implicitArgs[implicitArgs.length - 1]);
                    }
                }
            });

            if (missingModule === true && failOnMissingDependency !== true)
            {
                if (requireLogger.debugEnabled)
                {
                    requireLogger.debug('Calling errCallback for call to require(string[], function, function?)');
                }
                // signature is fn(dependencies[], moduleResolutions[],
                // implicitResolutions[])
                result = errCallback.call(this, dependencies, args, implicitArgs);
            }
            else if (typeof callback === 'function')
            {
                if (requireLogger.debugEnabled)
                {
                    requireLogger.debug('Calling standard callback for call to require(string[], function, function?)');
                }
                result = callback.apply(this, args);
            }
            else
            {
                throw new Error('No callback was provided');
            }

            return result;
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
                },
                moduleListeners : {
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

        internal = Object.create(Object.prototype,
                {

                    copySharedModule : {
                        value : function amd__moduleRegistry__internal__copySharedModule(backupModule)
                        {
                            var module, normalizedId, am;

                            am = active.modules;

                            // simply use backup-ed module as prototype
                            // prevent prototype mutation by re-adding mutables
                            // locally
                            module = Object.create(backupModule, {
                                initialized : {
                                    value : backupModule.initialized,
                                    enumerable : true,
                                    writable : !backupModule.initialized
                                },
                                constructing : {
                                    value : false,
                                    enumerable : true,
                                    writable : !backupModule.initialized
                                },
                                result : {
                                    value : backupModule.result,
                                    enumerable : true,
                                    writable : !backupModule.initialized
                                }
                            });

                            am[module.id] = module;
                            if (typeof module.url === 'string')
                            {
                                active.modulesByUrl[module.url] = module;
                            }

                            if (typeof module.loader === 'string' && module.id.indexOf(module.loader + '!') !== 0)
                            {
                                normalizedId = module.loader + '!' + module.id;
                                am[normalizedId] = module;
                            }

                            return module;
                        }
                    },

                    getModule : {
                        value : function amd__moduleRegistry__internal__getModule(moduleId)
                        {
                            var module;

                            module = active.modules[moduleId];
                            if (commonLogger.traceEnabled)
                            {
                                commonLogger.trace('Module {} has {}been defined', moduleId, isObject(module) ? '' : 'not ');
                            }

                            if (!isObject(module) && moduleId in backup.modules)
                            {
                                if (commonLogger.traceEnabled)
                                {
                                    commonLogger.trace('Restoring module {} from shared AMD loader state', moduleId);
                                }
                                module = this.copySharedModule(backup.modules[moduleId]);
                            }

                            if (module === undefined)
                            {
                                module = active.modules[moduleId] = DUMMY_MODULE;
                            }

                            return module;
                        }
                    },

                    copySharedListenerInModuleList : {
                        value : function amd__moduleRegistry__internal__copySharedListenerInModuleList(listener, index, arr)
                        {
                            var copiedListener;

                            if (listener.id in active.moduleListeners)
                            {
                                copiedListener = active.moduleListeners[listener.id];
                            }

                            if (copiedListener === undefined)
                            {
                                // simply use backup-ed listener as prototype
                                // prevent prototype mutation by re-adding
                                // mutables locally
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
                                active.moduleListeners[listener.id] = copiedListener;
                            }

                            arr[index] = copiedListener;
                        }
                    },

                    getModuleListeners : {
                        value : function amd__moduleRegistry__getModuleListeners(moduleId)
                        {
                            var aml, listeners;

                            aml = active.moduleListenersByModule;
                            listeners = aml[moduleId];
                            if (commonLogger.traceEnabled)
                            {
                                commonLogger.trace('Listeners for module {} have {}been defined', moduleId, Array.isArray(listeners) ? ''
                                        : 'not ');
                            }

                            if (!Array.isArray(listeners) && moduleId in backup.moduleListenersByModule)
                            {
                                if (commonLogger.traceEnabled)
                                {
                                    commonLogger.trace('Restoring listeners for module {} from shared AMD loader state', moduleId);
                                }

                                listeners = Array.prototype.slice.call(backup.moduleListenersByModule[moduleId], 0);
                                listeners.forEach(this.copySharedListenerInModuleList);

                                aml[moduleId] = listeners;
                            }
                            else
                            {
                                listeners = aml[moduleId] = [];
                            }

                            return listeners;
                        }
                    },

                    updateSharedStateModules : {
                        value : function amd__moduleRegistry__internal__updateSharedStateModules()
                        {
                            var moduleId, am, bm, transferredModuleIds;

                            am = active.modules;
                            bm = backup.modules;

                            transferredModuleIds = [];
                            // can't use hasOwnProperty on JSObject am and no
                            // prototype exists to inject unwanted/unintended
                            // properties
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

                            if (commonLogger.traceEnabled)
                            {
                                commonLogger.trace('Transferred registered modules {} to shared state', JSON
                                        .stringify(transferredModuleIds));
                            }
                        }
                    },

                    updateSharedStateListeners : {
                        value : function amd__moduleRegistry__internal__updateSharedStateListeners()
                        {
                            var moduleId, albm, blbm;

                            albm = active.moduleListenersByModule;
                            blbm = backup.moduleListenersByModule;

                            // can't use hasOwnProperty on JSObject albm and no
                            // prototype exists to inject unwanted/unintended
                            // properties
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

                            if (commonLogger.traceEnabled)
                            {
                                commonLogger.trace('Transferred registered module listeners to shared state');
                            }
                        }
                    }
                });

        result = Object
                .create(
                        Object.prototype,
                        {
                            addModuleListener : {
                                value : function amd__moduleRegistry__addModuleListener(listener)
                                {
                                    var dependencyResolutionCheckHandler, handleDependencies, args, dependencyCollectionHandler;

                                    dependencyResolutionCheckHandler = function amd__moduleRegistry__addModuleListener_dependencyResolutionCheckHandler(
                                            dependency)
                                    {
                                        var module = internal.getModule(dependency);
                                        if (isObject(module)
                                                && module !== DUMMY_MODULE
                                                && (typeof module.factory === 'function' || (module.result !== undefined && module.result !== null)))
                                        {
                                            listener.resolved.push(module.id);
                                        }
                                    };
                                    listener.dependencies.forEach(dependencyResolutionCheckHandler);

                                    if (listener.dependencies.length === listener.resolved.length)
                                    {
                                        handleDependencies = function amd__moduleRegistry__addModuleListener_handleDependencies(dependency,
                                                idx, arr)
                                        {
                                            var depModule = moduleManagement.getModule(dependency, true, listener.isSecure, listener.url);
                                            arr[idx] = depModule;
                                        };

                                        args = listener.dependencies.slice();
                                        args.forEach(handleDependencies);
                                        listener.callback.apply(this, args);
                                        listener.triggered = true;
                                    }

                                    if (listener.triggered !== true)
                                    {
                                        dependencyCollectionHandler = function amd__moduleRegistry__addModuleListener_dependencyCollectionHandler(
                                                dependency)
                                        {
                                            var listeners = internal.getModuleListeners(dependency);

                                            if (NashornScriptProcessor.isInEngineContextInitialization()
                                                    && !(dependency in backup.moduleListenersByModule))
                                            {
                                                backup.moduleListenersByModule[dependency] = listeners;
                                            }

                                            listeners.push(listener);
                                        };

                                        listener.dependencies.forEach(dependencyCollectionHandler);
                                    }
                                }
                            },

                            getModule : {
                                value : function amd__moduleRegistry__getModule(moduleId)
                                {
                                    return internal.getModule(moduleId);
                                }
                            },

                            getModuleByUrl : {
                                value : function amd__moduleRegistry__getModuleByUrl(moduleUrl)
                                {
                                    var module, backedUpModules;

                                    if (moduleUrl in active.modulesByUrl)
                                    {
                                        module = active.modulesByUrl[moduleUrl];
                                    }
                                    else
                                    {
                                        backedUpModules = backup.modules;
                                        Object.keys(backedUpModules).forEach(
                                                function amd__moduleRegistry__getModuleByUrl_forEachModuleId(moduleId)
                                                {
                                                    if (module === undefined && backedUpModules[moduleId].url === moduleUrl)
                                                    {
                                                        // this inheritantly
                                                        // marks the module as
                                                        // "active" in current
                                                        // execution context to
                                                        // improve future
                                                        // lookups by url
                                                        module = internal.getModule(moduleId);
                                                    }
                                                });
                                    }

                                    return module;
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

                                    moduleIds.forEach(function amd__moduleRegistry__addModule_registerForEachModuleIdVariant(moduleId)
                                    {
                                        am[moduleId] = module;
                                    });

                                    // if still in initialisation add to backup
                                    if (NashornScriptProcessor.isInEngineContextInitialization())
                                    {
                                        moduleIds.forEach(function amd__moduleRegistry__addModule_backupForEachModuleIdVariant(moduleId)
                                        {
                                            bm[moduleId] = module;
                                        });

                                        if (moduleIds.length !== 0)
                                        {
                                            if (commonLogger.traceEnabled)
                                            {
                                                commonLogger.trace('Transferred newly registered modules {} to shared state', JSON
                                                        .stringify(moduleIds));
                                            }
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

                                    listeners = internal.getModuleListeners(module.id);

                                    if (Array.isArray(listeners))
                                    {
                                        handleDependencies = function amd__moduleRegistry__checkAndFulfillModuleListeners_handleDependencies(
                                                listener, dependency, idx, arr)
                                        {
                                            var depModule = moduleManagement.getModule(dependency, true, listener.isSecure, listener.url);
                                            arr[idx] = depModule;
                                        };

                                        handleListener = function amd__moduleRegistry__checkAndFulfillModuleListeners_handleListener(
                                                listener)
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
                            updateSharedState : {
                                value : function amd__moduleRegistry__updateSharedState()
                                {
                                    if (commonLogger.debugEnabled)
                                    {
                                        commonLogger.debug('Updating AMD loader shared state');
                                    }
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
        var nashornLoad, Adapter, defaultScope, URL, GloballyRegisteredURLStreamHandler, specialModuleHandling, internal, external;

        nashornLoad = load;
        Adapter = JSAdapter;
        defaultScope = this;
        URL = Java.type('java.net.URL');

        try
        {
            GloballyRegisteredURLStreamHandler = Java.type('de.axelfaust.alfresco.nashorn.jdk8wa.GloballyRegisteredURLStreamHandler');
        }
        catch (ignore)
        {
            if (commonLogger.infoEnabled)
            {
                commonLogger.info('JDK 8 workarounds library not available');
            }
        }

        specialModuleHandling = Object.create(null, {
            convertSpecialModule : {
                value : function amd__moduleManagement__specialModuleHandling__convertSpecialModule(module, descriptor, url, scope)
                {
                    var result, specificAdaptee;

                    if (typeof module === 'function' && (!('_specialHandling' in module) || module._specialHandling !== false))
                    {
                        result = Function.prototype.bind.call(specialModuleHandling.specialModuleFnCall, undefined, module, descriptor,
                                url, scope);

                        Object.keys(module).forEach(
                                function amd__moduleManagement__specialModuleHandling__convertSpecialModule_forEachFunctionKey(key)
                                {
                                    result[key] = specialModuleHandling.convertSpecialModule(module[key], descriptor, url, module);
                                });
                    }
                    else if (isObject(module))
                    {
                        specificAdaptee = {};

                        Object.keys(specialModuleHandling.specialModuleAdaptee).forEach(
                                function amd__moduleManagement__specialModuleHandling__convertSpecialModule_forEachAdapteeFunctionName(key)
                                {
                                    specificAdaptee[key] = Function.prototype.bind.call(specialModuleHandling.specialModuleAdaptee[key],
                                            undefined, module, descriptor, url);
                                });

                        result = new Adapter(module, {}, specificAdaptee);
                    }
                    else
                    {
                        result = module;
                    }

                    return result;
                }
            },
            specialModuleFnCall : {
                value : function amd__moduleManagement__specialModuleHandling__specialModuleFnCall(fn, descriptor, url, scope)
                {
                    var result, args;

                    args = Array.prototype.slice.call(arguments, 4);

                    if (commonLogger.traceEnabled)
                    {
                        commonLogger.trace('Special module function {} called from {}', fn.name, url);
                    }

                    if ((!('_specialHandling' in fn) || fn._specialHandling !== false) && descriptor.hasOwnProperty('callerTagged')
                            && descriptor.callerTagged === true)
                    {
                        withTaggedCaller(function amd__moduleManagement__specialModuleFnCall__callerTagged()
                        {
                            result = fn.apply(scope, args);
                        }, url);
                    }
                    else
                    {
                        if (descriptor.hasOwnProperty('callerProvided') && descriptor.callerProvided === true)
                        {
                            if (callerLogger.traceEnabled)
                            {
                                callerLogger.trace('Prepending caller url {} to arguments', url);
                            }
                            args.splice(0, 0, url);
                        }
                        result = fn.apply(scope, args);
                    }

                    // result of call won't be converted into "special
                    // module"-aware

                    return result;
                }
            },

            specialModuleAdaptee : {
                value : {
                    __has__ : function amd__moduleManagement__specialModuleHandling__specialModuleAdaptee__has__(module, descriptor, url,
                            name)
                    {
                        var result = name in module;
                        return result;
                    },

                    __get__ : function amd__moduleManagement__specialModuleHandling__specialModuleAdaptee__get__(module, descriptor, url,
                            name)
                    {
                        var result;
                        if (descriptor.hasOwnProperty('callerTagged') && descriptor.callerTagged === true)
                        {
                            // property might be associated with a caller-aware
                            // getter
                            withTaggedCaller(
                                    function amd__moduleManagement__specialModuleHandling__specialModuleAdaptee__get__callerTagged()
                                    {
                                        result = module[name];
                                    }, url);
                        }
                        else
                        {
                            result = module[name];
                        }

                        result = specialModuleHandling.convertSpecialModule(result, descriptor, url, module);

                        return result;
                    },

                    __put__ : function amd__moduleManagement__specialModuleHandling__specialModuleAdaptee__put__(module, descriptor, url,
                            name, value)
                    {
                        var result;
                        if (descriptor.hasOwnProperty('callerTagged') && descriptor.callerTagged === true)
                        {
                            // property might be associated with a caller-aware
                            // setter
                            withTaggedCaller(
                                    function amd__moduleManagement__specialModuleHandling__specialModuleAdaptee__put__callerTagged()
                                    {
                                        result = (module[name] = value);
                                    }, url);
                        }
                        else
                        {
                            result = (module[name] = value);
                        }

                        result = specialModuleHandling.convertSpecialModule(result, descriptor, url, module);

                        return result;
                    },

                    __delete__ : function amd__moduleManagement__specialModuleHandling__specialModuleAdaptee__delete__(module, descriptor,
                            url, name)
                    {
                        var result = delete module[name];
                        return result;
                    },

                    __getIds__ : function amd__moduleManagement__specialModuleHandling__specialModuleAdaptee__getIds__(module)
                    {
                        var name, result = [];

                        /* jshint forin: false */
                        for (name in module)
                        {
                            result.push(name);
                        }
                        /* jshint forin: true */

                        return result;
                    },

                    __getValues__ : function amd__moduleManagement__specialModuleHandling__specialModuleAdaptee__getValues__(module,
                            descriptor, url)
                    {
                        var result = [];

                        if (descriptor.hasOwnProperty('callerTagged') && descriptor.callerTagged === true)
                        {
                            // properties might be associated with a
                            // caller-aware getter
                            withTaggedCaller(
                                    function amd__moduleManagement__specialModuleHandling__specialModuleAdaptee__getValues__callerTagged()
                                    {
                                        var name, value;
                                        /* jshint forin:false */
                                        for (name in module)
                                        {
                                            value = module[name];
                                            value = specialModuleHandling.convertSpecialModule(value, descriptor, url, module);
                                            result.push(value);
                                        }
                                        /* jshint forin:true */
                                    }, url);
                        }
                        else
                        {
                            // bug in jshint - claims name as implicitly defined
                            // global if included in first var block
                            /* jshint ignore:start */
                            var name, value;
                            for (name in module)
                            {
                                value = module[name];
                                value = specialModuleHandling.convertSpecialModule(value, descriptor, url, module);
                                result.push(value);
                            }
                            /* jshint ignore:end */
                        }
                        return result;
                    },

                    __call__ : function amd__moduleManagement__specialModuleHandling__specialModuleAdaptee__call__(module, descriptor, url,
                            name)
                    {
                        var result, args;

                        if (commonLogger.traceEnabled)
                        {
                            commonLogger.trace('Special module proxy called on {} from {}', name, url);
                        }

                        args = Array.prototype.slice.call(arguments, 4);
                        args = [ module[name], descriptor, url, module ].concat(args);
                        result = specialModuleHandling.specialModuleFnCall.apply(undefined, args);
                        return result;
                    },

                    __new__ : function amd__moduleManagement__specialModuleHandling__specialModuleAdaptee__new__(module, descriptor, url)
                    {
                        var result, args, BoundCtor;

                        if (commonLogger.traceEnabled)
                        {
                            commonLogger.trace('Special module proxy constructor-called from {}', url);
                        }

                        args = [ undefined ].concat(Array.prototype.slice.call(arguments, 3));

                        if (descriptor.hasOwnProperty('callerTagged') && descriptor.callerTagged === true)
                        {
                            withTaggedCaller(
                                    function amd__moduleManagement__specialModuleHandling__specialModuleAdaptee__new__callerTagged()
                                    {
                                        BoundCtor = Function.prototype.bind.apply(module, args);
                                        result = new BoundCtor();
                                    }, url);
                        }
                        else
                        {
                            if (descriptor.hasOwnProperty('callerProvided') && descriptor.callerProvided === true)
                            {
                                if (callerLogger.traceEnabled)
                                {
                                    callerLogger.trace('Prepending caller url {} to arguments', url);
                                }
                                args.splice(1, 0, url);
                            }
                            BoundCtor = Function.prototype.bind.apply(module, args);
                            result = new BoundCtor();
                        }

                        // result of constructor won't be converted into
                        // "special module"-aware

                        return result;
                    }
                }
            }
        });

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
                                    if (isObject(module) && module !== DUMMY_MODULE)
                                    {
                                        if (module.id === normalizedId)
                                        {
                                            throw new Error('Module \'' + normalizedId + '\' in script \'' + urlStr
                                                    + '\' has already been loaded once - it should not have been loaded again');
                                        }

                                        if (commonLogger.traceEnabled)
                                        {
                                            commonLogger.trace('Remapping already loaded module {} to {} from url {}', module.id,
                                                    normalizedId, url);
                                        }
                                        moduleRegistry.addModule(module, normalizedId);
                                    }
                                    else
                                    {
                                        if (commonLogger.debugEnabled)
                                        {
                                            commonLogger.debug('Loading module {} from url {} (secureSource: {})', normalizedId, url,
                                                    isSecureSource === true);
                                        }

                                        // minimal module for URL - just enough
                                        // for context use
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

                                        // we load with custom scope to prevent
                                        // pollution of the potentially shared
                                        // global
                                        // provide global modules as potentially
                                        // script-bound variants
                                        customScope = Object.create(defaultScope, {
                                            define : {
                                                value : moduleManagement.getModule('define', true, isSecureSource === true, urlStr)
                                            },
                                            require : {
                                                value : moduleManagement.getModule('require', true, isSecureSource === true, urlStr)
                                            }
                                        });

                                        if (GloballyRegisteredURLStreamHandler)
                                        {
                                            GloballyRegisteredURLStreamHandler.startScriptLoad();
                                            try
                                            {
                                                implicitResult = nashornLoad.call(customScope, url);
                                                GloballyRegisteredURLStreamHandler.endScriptLoad();
                                            }
                                            catch (e)
                                            {
                                                GloballyRegisteredURLStreamHandler.endScriptLoad();
                                                throw e;
                                            }
                                        }
                                        else
                                        {
                                            implicitResult = nashornLoad.call(customScope, url);
                                        }

                                        // no module defined yet by requested
                                        // module id
                                        // may be a non-module script with
                                        // implicit return value
                                        module = moduleRegistry.getModule(normalizedId);
                                        if (module === null)
                                        {
                                            // script may not define a module
                                            // we store the result of script
                                            // execution for
                                            // require(dependencies[],
                                            // successFn, errorFn)
                                            if (commonLogger.debugEnabled)
                                            {
                                                commonLogger.debug('Module {} from url {} yielded implicit result {}', normalizedId, url,
                                                        implicitResult);
                                            }

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

                                    if (commonLogger.debugEnabled)
                                    {
                                        commonLogger.debug('Registering pre-resolved module {}', normalizedId);
                                    }

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

                                    if (commonLogger.traceEnabled)
                                    {
                                        commonLogger.trace('Retrieving loader {} for module {}', loaderName, id);
                                    }

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
                                        if (commonLogger.debugEnabled)
                                        {
                                            commonLogger.debug('Module {} not defined yet - forcing load', normalizedId);
                                        }

                                        moduleManagement.loadModule(normalizedId, callerSecure, callerUrl);

                                        module = moduleRegistry.getModule(normalizedId);
                                        if (isObject(module))
                                        {
                                            if (commonLogger.traceEnabled)
                                            {
                                                commonLogger.trace('Module {} defined by load', normalizedId);
                                            }
                                        }
                                        else
                                        {
                                            if (commonLogger.debugEnabled)
                                            {
                                                commonLogger.debug('Module {} not defined after explicit load', normalizedId);
                                            }
                                            // avoid repeated loads by caching
                                            // missed-resolution
                                            moduleRegistry.addModule(DUMMY_MODULE, normalizedId);

                                            throw new AMDUnavailableModuleException('Module \'' + normalizedId
                                                    + '\' has not been defined yet and could not be loaded');
                                        }
                                    }
                                    else if (isObject(module) && module !== DUMMY_MODULE)
                                    {
                                        if (commonLogger.traceEnabled)
                                        {
                                            commonLogger.trace('Module {} already defined', normalizedId);
                                        }
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
                                    var moduleResult, isSecure, resolvedDependencies;

                                    if (typeof module.factory === 'function')
                                    {
                                        if (commonLogger.debugEnabled)
                                        {
                                            commonLogger.debug('Module {} not initialised yet - forcing initialisation', normalizedId);
                                        }

                                        module.constructing = true;
                                        try
                                        {
                                            if (module.dependencies.length === 0)
                                            {
                                                if (commonLogger.traceEnabled)
                                                {
                                                    commonLogger.trace('Module {} has no dependencies - calling factory', normalizedId);
                                                }

                                                module.result = module.factory();
                                            }
                                            else
                                            {
                                                isSecure = module.secureSource === true;

                                                if (commonLogger.traceEnabled)
                                                {
                                                    commonLogger.trace('Resolving {} dependencies for call to factory of {}',
                                                            module.dependencies.length, normalizedId);
                                                }
                                                resolvedDependencies = [];

                                                module.dependencies
                                                        .forEach(function amd__moduleManagement__constructModuleResult_forEachDependency(
                                                                dependencyModuleId)
                                                        {
                                                            var dependency;

                                                            if (dependencyModuleId === 'exports')
                                                            {
                                                                if (commonLogger.traceEnabled)
                                                                {
                                                                    commonLogger
                                                                            .trace(
                                                                                    'Module {} uses "exports"-dependency to expose module during initialisation (avoiding circular dependency issues)',
                                                                                    normalizedId);
                                                                }
                                                                module.result = {};
                                                                resolvedDependencies.push(module.result);
                                                            }
                                                            else
                                                            {
                                                                if (commonLogger.debugEnabled)
                                                                {
                                                                    commonLogger.debug('Loading dependency {} for module {}',
                                                                            dependencyModuleId, normalizedId);
                                                                }

                                                                dependency = moduleManagement.getModule(dependencyModuleId, true, isSecure,
                                                                        module.url);

                                                                resolvedDependencies.push(dependency);
                                                            }
                                                        });

                                                if (commonLogger.traceEnabled)
                                                {
                                                    commonLogger.trace('All dependencies of module {} resolved - calling factory',
                                                            normalizedId);
                                                }
                                                if (module.result !== null)
                                                {
                                                    module.factory.apply(this, resolvedDependencies);
                                                }
                                                else
                                                {
                                                    module.result = module.factory.apply(this, resolvedDependencies);
                                                }
                                                if (commonLogger.traceEnabled)
                                                {
                                                    commonLogger.trace('Instance/value for module {} initialized from factory',
                                                            normalizedId);
                                                }
                                            }
                                            module.initialized = true;

                                            // reset
                                            module.constructing = false;
                                        }
                                        catch (e)
                                        {
                                            if (commonLogger.infoEnabled)
                                            {
                                                if (e.nashornException instanceof Throwable)
                                                {
                                                    commonLogger.info('Failed to instantiate module', e.nashornException);
                                                }
                                                else
                                                {
                                                    commonLogger.info('Failed to instantiate module - {}', e.message);
                                                }
                                            }

                                            // reset
                                            module.constructing = false;

                                            throw e;
                                        }

                                        moduleResult = module.result;
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
                                            if (commonLogger.traceEnabled)
                                            {
                                                commonLogger.trace('Module {} already initialized', normalizedId);
                                            }
                                            moduleResult = module.result;

                                            // special case where module was
                                            // only defined to track implicit
                                            // return values
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

        external = Object.create(Object.prototype, {
            loadModule : {
                value : function amd__moduleManagement__loadModule(normalizedId, callerSecure, callerUrl)
                {
                    var loaderName, id, idFragments, length, prospectivePackageName, packageConfig;

                    if (commonLogger.debugEnabled)
                    {
                        commonLogger.debug('Loading module {}', normalizedId);
                    }

                    if (/^[^!]+!.+$/.test(normalizedId))
                    {
                        loaderName = normalizedId.substring(0, normalizedId.indexOf('!'));
                        id = normalizedId.substring(normalizedId.indexOf('!') + 1);

                        internal.loadModuleViaLoader(normalizedId, id, loaderName, callerSecure, callerUrl);
                    }
                    else
                    {
                        if (commonLogger.traceEnabled)
                        {
                            commonLogger.trace('Resolving module {} against configured packages', normalizedId);
                        }

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
                    if (commonLogger.debugEnabled)
                    {
                        commonLogger.debug('Retrieving module {} (force load: {})', normalizedId, doLoad);
                    }

                    module = internal.loadModuleDefinition(normalizedId, doLoad, callerSecure, callerUrl);
                    moduleResult = internal.loadModuleResult(normalizedId, module, doLoad, callerSecure, callerUrl);

                    if (moduleResult instanceof SpecialModuleWrapper)
                    {
                        if (callerSecure !== true && moduleResult.hasOwnProperty('secureUseOnly') && moduleResult.secureUseOnly === true)
                        {
                            throw new Error('Access to module \'' + normalizedId + '\' is not allowed for unsecure caller \'' + callerUrl
                                    + '\'');
                        }

                        moduleResult = specialModuleHandling.convertSpecialModule(moduleResult.wrapped, moduleResult, callerUrl);
                    }

                    return moduleResult;
                }
            }
        });

        return external;
    }.call(this));

    (function amd__require__whenAvailable__init()
    {
        var UUID = Java.type('java.util.UUID');

        require.whenAvailable = function amd__require__whenAvailable(dependencies, callback)
        {
            var normalizedModuleId, contextScriptUrl, contextModule, isSecure, listener;

            if (callback === undefined || callback === null)
            {
                throw new Error('No callback provided');
            }

            if (typeof callback !== 'function')
            {
                throw new Error('Callback is not a function');
            }

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
                dependencies.forEach(function amd__require__whenAvailable_forEachDependency(dependency)
                {
                    normalizedModuleId = normalizeModuleId(dependency, contextModule, contextScriptUrl);
                    listener.dependencies.push(normalizedModuleId);
                });
            }
            else
            {
                throw new Error('Invalid dependencies');
            }

            Object.freeze(listener.dependencies);

            if (requireLogger.traceEnabled)
            {
                requireLogger.trace('Registered listener from url {} (secureSource: {}) for modules {}', contextScriptUrl, isSecure, JSON
                        .stringify(listener.dependencies));
            }
            else if (requireLogger.debugEnabled)
            {
                requireLogger.debug('Registered listener from url {} (secureSource: {})', contextScriptUrl, isSecure);
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

        if (requireLogger.traceEnabled)
        {
            requireLogger.trace('Configuring AMD loader with config {}', JSON.stringify(config));
        }
        else if (requireLogger.debugEnabled)
        {
            requireLogger.debug('Configuring AMD loader');
        }

        configKeyFn = function amd__require_config_key(key)
        {
            var packageConfigs;

            switch (key)
            {
                case 'packages':
                    packageConfigs = config[key];

                    if (Array.isArray(packageConfigs))
                    {
                        if (requireLogger.debugEnabled)
                        {
                            requireLogger.debug('Configuring AMD packages');
                        }

                        packageConfigs.forEach(packageFn, this);
                    }
                    break;
                case 'map':
                    if (isObject(config[key]))
                    {
                        if (requireLogger.debugEnabled)
                        {
                            requireLogger.debug('Configuring AMD mapppings');
                        }

                        mapFn.call(this, config[key]);
                    }
                    break;
                default:
                    if (requireLogger.warnEnabled)
                    {
                        requireLogger.warn('Ignoring unsupported AMD loader option {}', key);
                    }
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

            if (requireLogger.traceEnabled)
            {
                requireLogger.trace('Adding AMD package {} using loader {} (package location: {})', packName, packLoader, packLocation);
            }

            packages[packName] = {
                name : packName,
                loader : packLoader
            };

            if (packLocation !== null && typeof packLocation === 'string')
            {
                // TODO Can we relax this? Location is intended to be a virtual
                // prefix to the module ID, so it
                // needs to conform to same rules we apply on packLoader as
                // module ID
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
            if (requireLogger.warnEnabled)
            {
                if (e.nashornException instanceof Throwable)
                {
                    requireLogger.warn('Failed to configure AMD loader', e.nashornException);
                }
                else
                {
                    requireLogger.warn('Failed to configure AMD loader - {}', e.message);
                }
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
                if (callerLogger.debugEnabled)
                {
                    callerLogger.debug('Tagged script caller reset to {}', originalScriptUrl);
                }
            };
        };

        /**
         * Retrieves the URL of the script file calling the caller. The script
         * URL is determined from the current stack and excludes both the script
         * of this operation as well as the immediate caller. Unless explicitly
         * specified not to, this function will respect any fixed caller script
         * URL tagged in the current execution context.
         * 
         * @instance
         * @memberof require
         * @param {boolean}
         *            suppressTaggedCaller - if this function should ignore the
         *            current tagged caller state and lookup the real caller
         *            script file
         * @returns {string} the URL of the calling script file
         */
        require.getCallerScriptURL = function amd__require__getCallerScriptURL(suppressTaggedCaller)
        {
            var contextScriptUrl;

            // skip this and the caller script to determine script URL of
            // callers caller
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
        require.getCallerScriptURL._specialHandling = false;

        /**
         * Retrieves the ID of the module defined by a specific script file.
         * 
         * @instance
         * @memberof require
         * @param {string}
         *            contextScriptUrl - the script file URL for which to
         *            retrieve the defined module ID
         * @returns {string|undefined} the module ID for the script file - since
         *          script files loaded via a loader module always define at
         *          least an implicit module based on the implicit return value,
         *          the only time the result may be undefined would be if no
         *          script file identified by the URL has been loaded at all, or
         *          the implicit result value was undefined and the script file
         *          did not explicitly define any module
         */
        require.getScriptFileModuleId = function amd__require__getScriptFileModuleId(contextScriptUrl)
        {
            var contextModule, moduleId;

            if (requireLogger.traceEnabled)
            {
                requireLogger.trace('Determining module id for script url {}', contextScriptUrl);
            }

            contextModule = moduleRegistry.getModuleByUrl(contextScriptUrl);

            if (isObject(contextModule) && contextModule !== DUMMY_MODULE)
            {
                moduleId = contextModule.id;

                if (moduleId.indexOf(contextModule.loader + '!') === 0)
                {
                    moduleId = moduleId.substring(moduleId.indexOf('!') + 1);
                }
            }

            if (requireLogger.debugEnabled)
            {
                requireLogger.debug('Determined module id {} for script url {}', moduleId, contextScriptUrl);
            }

            return moduleId;
        };
        require.getScriptFileModuleId._specialHandling = false;

        /**
         * Retrieves the name of the loader module used to load a specific
         * script file.
         * 
         * @instance
         * @memberof require
         * @param {string}
         *            contextScriptUrl - the script file URL for which to
         *            retrieve the loader module name
         * @returns {string|undefined} the loader module name if the script file
         *          identified by the URL has been loaded via a loader
         */
        require.getScriptFileModuleLoader = function amd__require__getScriptFileModuleLoader(contextScriptUrl)
        {
            var contextModule, moduleLoader;

            if (requireLogger.traceEnabled)
            {
                requireLogger.trace('Determining module loader id for script url {}', contextScriptUrl);
            }

            contextModule = moduleRegistry.getModuleByUrl(contextScriptUrl);

            if (isObject(contextModule) && contextModule !== DUMMY_MODULE)
            {
                moduleLoader = contextModule.loader;
            }

            if (requireLogger.debugEnabled)
            {
                requireLogger.debug('Determined module loader id {} for script url {}', moduleLoader, contextScriptUrl);
            }

            return moduleLoader;
        };
        require.getScriptFileModuleLoader._specialHandling = false;

        /**
         * Executes a callback with a fixed caller script URL tagged in the
         * current execution context. The script URL is determined from the
         * current stack and excludes both the script of this operation as well
         * as the immediate caller.
         * 
         * @instance
         * @memberof require
         * @param {function}
         *            callback - the callback to execute
         * @param {boolean}
         *            [untaggedOnly] - flag if the execution context should only
         *            be tagged if not already tagged at the time of the call
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

                if (callerLogger.debugEnabled)
                {
                    callerLogger.debug('Executing function {} with tagged script caller {}', callback.name, contextScriptUrl);
                }

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
            else if (callerLogger.infoEnabled)
            {
                callerLogger.info(
                        'Attempted to execute function with a tagged script caller {}, but provided no callback function to execute',
                        contextScriptUrl);
            }

            return result;
        };
        require.withTaggedCallerScript._specialHandling = false;

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

            if (callerLogger.debugEnabled)
            {
                callerLogger.debug('Executing function {} with tagged script caller {}', callback.name, callerScriptUrl);
            }

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
     * The factory callback for modules defined via the {@link define} function.
     * 
     * @callback defineModuleFactory
     * @param {...object}
     *            module - the resolved module(s) in the order specified in the
     *            modules dependencies list
     */

    /**
     * Defines a new module that can then be requested / required from client
     * code or other modules.
     * 
     * @global
     * @param {string}
     *            [moduleId] - the ID of the module being defined - if this
     *            parameter is not provided the define function will try to
     *            derive an implicit ID from the current execution context (e.g.
     *            references used to load the currently executed script file)
     * @param {string[]}
     *            [dependencies] - the list of module dependencies for the
     *            module to be defined
     * @param {defineModuleFactory}
     *            factory - the factory callback to construct the module if it
     *            is requested / required
     */
    define = function amd__define()
    {
        var id, normalizedId, dependencies, factory, idx, contextScriptUrl, contextModule, module;

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
            // we don't default to standard dependencies of CommonJS
            // (["require", "exports", "module"})
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

        if (defineLogger.traceEnabled)
        {
            defineLogger.trace('Defining module {} from url {} with dependencies {} (secureSource: {})', id, contextScriptUrl, JSON
                    .stringify(dependencies), isObject(contextModule) ? contextModule.secureSource : false);
        }
        else if (defineLogger.debugEnabled)
        {
            defineLogger.debug('Defining module {} from url {} (secureSource: {})', id, contextScriptUrl,
                    isObject(contextModule) ? contextModule.secureSource : false);
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

    /**
     * Wraps and tags a module with one or multiple feature flags that the AMD
     * module system handles accordingly when references to the module are
     * requested as dependencies of other modules.
     * 
     * @instance
     * @memberof define
     * @param {object|function}
     *            module - the actual module instance
     * @param {string[]}
     *            flags - the feature flags to be applied to the module
     */
    // TODO Turn string[] parameter into vararg (less costly callsite handling)
    define.asSpecialModule = function amd__define_asSpecialModule(module, flags)
    {
        var wrapper;

        if (defineLogger.debugEnabled)
        {
            defineLogger.debug('Tagging module as special with flags {}', JSON.stringify(flags));
        }
        wrapper = new SpecialModuleWrapper(module);

        if (Array.isArray(flags))
        {
            flags.forEach(function amd__define_asSpecialModule_forEachFlag(flag)
            {
                if (define.amd.supportedModuleFlags.indexOf(flag) !== -1)
                {
                    wrapper[flag] = true;
                }
            });
        }

        return wrapper;
    };
    define.asSpecialModule._specialHandling = false;

    /**
     * Preloads a specific module in such a way that its defining script file is
     * loaded to ensure that the module is defined. This operation will not
     * cause any module factory to be called.
     * 
     * @instance
     * @memberof define
     * @param {string}
     *            moduleId - the ID of the module to preload
     * @param {string}
     *            [aliasModuleId] - an alternative ID of the module to be used
     *            to lookup / initialize the module after load (in case the
     *            moduleId is used to load a module which specifies a different
     *            module ID in its call to define)
     */
    define.preload = function amd__define_preload(moduleId, aliasModuleId)
    {
        var normalizedModuleId, module;

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
                if (defineLogger.debugEnabled)
                {
                    defineLogger.debug('Pre-loading module {}', normalizedModuleId);
                }
                moduleManagement.loadModule(normalizedModuleId, true);

                // if it a module has been registered with the expected name
                // initialize it too
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
    define.preload._specialHandling = false;

    // mininum object to identify define as AMD compatible
    define.amd = {
        supportedModuleFlags : [ 'secureUseOnly', 'callerTagged', 'callerProvided' ]
    };

    // freeze all the things
    Object.freeze(require.whenAvailable);
    Object.freeze(require.getScriptFileModuleId);
    Object.freeze(require.getScriptFileModuleLoader);
    Object.freeze(require.getCallerScriptURL);
    Object.freeze(require.withTaggedCallerScript);
    // require / require.config can't be frozen yet
    Object.freeze(define.asSpecialModule);
    Object.freeze(define.preload);
    Object.freeze(define.amd.supportedModuleFlags);
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
         * This loader module provides the ability to bootstrap / load the other
         * core module loaders of the Nashorn script engine AMD framework.
         * 
         * @module loaderMetaLoader
         * @author Axel Faust
         */
        loaderMetaLoader = {
            /**
             * Loads a core module loader from the classpath location
             * de/axelfaust/alfresco/nashorn/repo/loaders without any support
             * for overriding via Alfresco extension paths.
             * 
             * @instance
             * @param {string}
             *            normalizedId - the normalized ID of the module to load
             * @param {function}
             *            require - the context-sensitive require function
             * @param {function}
             *            load - the callback to load either a pre-built object
             *            as the module result or a script defining a module
             *            from a script URL
             */
            load : function amd__loaderMetaLoader__load(normalizedId, /*
                                                                         * jshint
                                                                         * unused:
                                                                         * false
                                                                         */require, load)
            {
                var url = new URL('rawclasspath', null, -1, 'de/axelfaust/alfresco/nashorn/repo/loaders/' + normalizedId, streamHandler);

                if (commonLogger.debugEnabled)
                {
                    commonLogger.debug('Loading loader module {} from classpath', normalizedId);
                }

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
            value : define.asSpecialModule(require, [ 'callerTagged' ]),
            enumerable : true
        },
        secureSource : {
            value : true,
            enumerable : true
        }
    }), 'require');

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
            value : define.asSpecialModule(define, [ 'callerTagged' ]),
            enumerable : true
        },
        secureSource : {
            value : true,
            enumerable : true
        }
    }), 'define');

    Object.defineProperties(this, {
        require : {
            value : require,
            enumerable : false
        },
        define : {
            value : define,
            enumerable : false
        }
    });
}.call(this));
