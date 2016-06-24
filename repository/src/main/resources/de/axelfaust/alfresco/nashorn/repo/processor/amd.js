/* globals -require */
/* globals -define */
/* globals Java: false */
/* globals SimpleLogger: false */
/* globals load: false */
(function amd()
{
    'use strict';

    // execution specific state
    var modules, moduleByUrl, moduleListenersByModule, executionState,
    // core AMD config and backup state
    mappings = {}, packages = {}, moduleBackup = {}, moduleListenersByModuleBackup = {},
    // Nashorn script loading utils
    nashornLoad = load, defaultScope = this,
    // internal fns
    isObject, ensureExecutionStateInit, getRestoreTaggedCallerFn, normalizeSimpleId, normalizeModuleId, mapModuleId, loadModule, getModule, checkAndFulfillModuleListeners, _load, SecureUseOnlyWrapper,
    // internal error subtype
    UnavailableModuleError,
    // Java utils
    UUID, NashornUtils, NashornScriptModel, NashornScriptProcessor, Throwable, URL, AlfrescoClasspathURLStreamHandler, streamHandler, logger,
    // meta loader module
    loaderMetaLoader,
    // public fns
    require, define;

    UUID = Java.type('java.util.UUID');
    NashornUtils = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornUtils');
    NashornScriptModel = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModel');
    NashornScriptProcessor = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor');
    Throwable = Java.type('java.lang.Throwable');
    URL = Java.type('java.net.URL');
    logger = new SimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.amd');

    // setup script aware data containers
    modules = NashornScriptModel.newAssociativeContainer();
    moduleByUrl = NashornScriptModel.newAssociativeContainer();
    moduleListenersByModule = NashornScriptModel.newAssociativeContainer();
    executionState = NashornScriptModel.newAssociativeContainer();

    // TODO Profiling shows constructor to be somewhat expensive - optimize to avoid e.g. up-front stack cost
    UnavailableModuleError = function amd__UnavailableModuleError()
    {
        var t = Error.apply(this, arguments);
        this.stack = t.stack;
        this.message = t.message;
        return this;
    };

    UnavailableModuleError.prototype = Object.create(Error.prototype);
    UnavailableModuleError.prototype.name = 'UnavailableModuleError';
    UnavailableModuleError.prototype.constructor = UnavailableModuleError;

    isObject = function amd__isObject(o)
    {
        var result = o !== undefined && o !== null && Object.prototype.toString.call(o) === '[object Object]';
        return result;
    };

    ensureExecutionStateInit = function amd__ensureExecutionStateInit()
    {
        var moduleId, moduleIds, moduleInit, listenerInit, initializedListeners;

        if (modules.length === 0)
        {
            moduleIds = [];
            moduleInit = function amd__ensureExecutionStateInit_moduleInit(moduleId)
            {
                var module, backedUpModule, normalizedId;

                backedUpModule = moduleBackup[moduleId];
                if (isObject(backedUpModule) && !(moduleId in modules))
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
                    modules[module.id] = module;
                    moduleByUrl[module.url] = module;

                    if (typeof module.loader === 'string'
                            && !(module.id.indexOf(module.loader) === 0 && module.id.indexOf('!') === module.loader.length))
                    {
                        normalizedId = module.loader + '!' + module.id;
                        modules[normalizedId] = module;
                        moduleIds.push(normalizedId);
                    }
                }
            };
            Object.keys(moduleBackup).forEach(moduleInit);
            logger.trace('Restored registered modules {} from shared backup', JSON.stringify(moduleIds));
        }

        if (moduleListenersByModule.length === 0 && Object.keys(moduleListenersByModuleBackup).length > 0)
        {
            initializedListeners = {};
            listenerInit = function amd__ensureExecutionStateInit_listenerInit(listener, index, arr)
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

            for (moduleId in moduleListenersByModuleBackup)
            {
                if (Array.isArray(moduleListenersByModuleBackup[moduleId]))
                {
                    // shallow copy array
                    moduleListenersByModule[moduleId] = moduleListenersByModuleBackup[moduleId].slice();
                    // decouple elements from the backup state
                    moduleListenersByModule[moduleId].forEach(listenerInit);
                }
            }
        }
    };

    getRestoreTaggedCallerFn = function amd__getRestoreTaggedCallerFn(scriptUrl, taggerUrl)
    {
        var originalScriptUrl = scriptUrl, taggerScriptUrl = taggerUrl;

        return function amd__require_tagCallerScript_restoreFn()
        {
            executionState.taggedCallerScriptUrl = originalScriptUrl;

            logger.debug('Script "{}" has reset the tagged script caller', taggerScriptUrl);
        };
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

    // TODO Outsource / delegate to Java code for potential performance improvements
    mapModuleId = function amd__mapModuleId(moduleId, contextModuleId)
    {
        var result = moduleId, mapped = false, mapping, contextFragments, fragments, cmax, max, contextLookup, lookup;

        if (typeof contextModuleId === 'string')
        {
            contextFragments = contextModuleId.split('/');

            for (cmax = contextFragments.length - 1; cmax > 0 && mapped === false; cmax -= 1)
            {
                contextLookup = contextFragments.slice(0, cmax).join('/');
                if (mappings.hasOwnProperty(contextLookup))
                {
                    mapping = mappings[contextLookup];

                    for (max = fragments.length - 1; max > 0 && mapped === false; max -= 1)
                    {
                        lookup = fragments.slice(0, max).join('/');
                        if (mapping.hasOwnProperty(lookup))
                        {
                            result = mapping[lookup];
                            result += '/' + fragments.slice(max, fragments.length).join('/');
                            mapped = true;

                            logger.trace('Mapped module id {} to {} via mapping of package {}', [ moduleId, result, lookup ]);
                        }
                    }
                }
            }
        }

        if (mapped !== true && mappings.hasOwnProperty('*'))
        {
            mapping = mappings['*'];
            fragments = moduleId.split('/');

            for (max = fragments.length - 1; max > 0 && mapped === false; max -= 1)
            {
                lookup = fragments.slice(0, max).join('/');
                if (mapping.hasOwnProperty(lookup))
                {
                    result = mapping[lookup];
                    result += '/' + fragments.slice(max, fragments.length).join('/');
                    mapped = true;

                    logger.trace('Mapped module id {} to {} via asterisk mapping', [ moduleId, result ]);
                }
            }
        }

        return result;
    };

    // TODO Outsource / delegate to Java code for potential performance improvements
    normalizeSimpleId = function amd__normalizeSimpleId(id, contextModule)
    {
        var fragments, result, moduleFragments;

        if (typeof id !== 'string')
        {
            throw new Error('Module ID was either not provided or is not a string');
        }

        logger.trace('Normalizing simple id "{}"', id);

        fragments = id.replace(/\\/g, '/').split('/');

        if (fragments[0] === '.' || fragments[0] === '..')
        {
            logger.trace('Simple id "{}" is in relative form', id);

            if (!isObject(contextModule))
            {
                throw new Error('Module ID is relative but call to normalize was made outside of an active module context');
            }

            logger.trace('Simple id "{}" will be resolved against context module "{}"', [ id, contextModule.id ]);

            moduleFragments = contextModule.id.split('/');
            // always remove the actual module identifier
            moduleFragments = moduleFragments.slice(0, moduleFragments.length - 1);
            if (fragments[0] === '.')
            {
                fragments.shift();

                if (fragments.length === 0)
                {
                    throw new Error('Module ID is relative with only a single sibling-level element');
                }

                fragments = moduleFragments.concat(fragments);
                result = fragments.join('/');
            }
            else
            {
                while (fragments[0] === '..')
                {
                    fragments.shift();

                    if (fragments.length === 0)
                    {
                        throw new Error('Module ID is relative with only parent-level elements');
                    }

                    if (moduleFragments.length === 0)
                    {
                        throw new Error('Module ID is relative with too many parent-level elements for current module context');
                    }

                    moduleFragments.pop();
                }

                fragments = moduleFragments.concat(fragments);
                result = fragments.join('/');
            }
        }
        else
        {
            result = fragments.join('/');
        }

        result = mapModuleId(result, isObject(contextModule) ? contextModule.id : '');

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
            loader = getModule(loaderName, true, isSecure, isObject(contextModule) ? contextModule.url : contextUrl);
            if (loader === undefined || loader === null)
            {
                throw new Error('No loader plugin named \'' + loaderName + '\' has been registered');
            }

            if (typeof loader.normalize === 'function')
            {
                logger.trace('Calling normalize-function of loader "{}"', loaderName);
                // protect against loader manipulating the contextModule by using a derivative
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

    _load = function amd__load(value, normalizedId, loaderName, isSecureSource, overrideUrl)
    {
        var url, urlStr, module, implicitResult, currentlyTaggedCallerScriptUrl, customScope;

        if (value !== undefined && value !== null)
        {
            if (value instanceof URL)
            {
                url = value;
                urlStr = String(url);
                if (urlStr in moduleByUrl)
                {
                    if (moduleByUrl[urlStr].id === normalizedId)
                    {
                        throw new Error('Module \'' + normalizedId + '\' in script \'' + urlStr
                                + '\' has already been loaded once - it should not have been loaded again');
                    }

                    logger.trace('Remapping already loaded module "{}" from url "{}"', [ normalizedId, url ]);

                    // simply remap the existing module
                    modules[normalizedId] = modules[moduleByUrl[urlStr].id];

                    // if still in initialisation add to backup
                    if (NashornScriptProcessor.isInEngineContextInitialization())
                    {
                        moduleBackup[normalizedId] = modules[normalizedId];
                    }
                }
                else
                {
                    logger.debug('Loading module "{}" from url "{}" (secureSource: {})', [ normalizedId, url, isSecureSource === true ]);

                    // minimal module for URL - just enough for context use
                    moduleByUrl[urlStr] = Object.create(null, {
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

                    // we load with custom scope to prevent pollution of the potentially shared global
                    customScope = Object.create(defaultScope);

                    currentlyTaggedCallerScriptUrl = executionState.taggedCallerScriptUrl;
                    executionState.taggedCallerScriptUrl = null;

                    try
                    {
                        implicitResult = nashornLoad.call(customScope, url);

                        // reset
                        executionState.taggedCallerScriptUrl = currentlyTaggedCallerScriptUrl;
                    }
                    catch (e)
                    {
                        // reset
                        executionState.taggedCallerScriptUrl = currentlyTaggedCallerScriptUrl;

                        throw e;
                    }

                    // no module defined yet by requested module id
                    // may be a non-module script with implicit return value
                    if (!(normalizedId in modules))
                    {
                        // script may not define a module
                        // we store the result of script execution for require(dependencies[], successFn, errorFn)
                        logger.debug('Module "{}" from url "{}" yielded implicit result "{}"', [ normalizedId, url, implicitResult ]);

                        module = Object.create(null, {
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

                        moduleByUrl[urlStr] = module;
                        modules[normalizedId] = module;

                        // if still in initialisation add to backup
                        if (NashornScriptProcessor.isInEngineContextInitialization())
                        {
                            moduleBackup[normalizedId] = module;
                        }
                    }
                }
            }
            else
            {
                logger.debug('Registering pre-resolved module "{}"', normalizedId);

                module = Object.create(null, {
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

                modules[normalizedId] = module;

                if (typeof overrideUrl === 'string')
                {
                    moduleByUrl[overrideUrl] = module;
                }

                // if still in initialisation add to backup
                if (NashornScriptProcessor.isInEngineContextInitialization())
                {
                    moduleBackup[normalizedId] = module;
                }
            }
        }
    };

    loadModule = function amd__loadModule(normalizedId, callerSecure, callerUrl)
    {
        var id, loaderName, loader, secureLoader, idFragments, prospectivePackageName, length, packageConfig;

        logger.debug('Loading module "{}"', normalizedId);

        if (/^[^!]+!.+$/.test(normalizedId))
        {
            loaderName = normalizedId.substring(0, normalizedId.indexOf('!'));
            id = normalizedId.substring(normalizedId.indexOf('!') + 1);

            logger.trace('Retrieving loader "{}" for module "{}"', [ loaderName, id ]);

            loader = getModule(loaderName, true, callerSecure, callerUrl);

            secureLoader = modules[loaderName].secureSource === true;

            if (typeof loader.load === 'function')
            {
                loader.load(id, require, function amd__loadModule_explicitLoaderCallback(value, isSecureSource, overrideUrl)
                {
                    if (secureLoader === true || isSecureSource === false)
                    {
                        _load(value, normalizedId, loaderName, isSecureSource, overrideUrl);
                    }
                    else
                    {
                        throw new Error('Insecure loader module \'' + loaderName + '\' cannot declare a loaded module as secure');
                    }
                });
            }
            else
            {
                throw new Error('Module \'' + loaderName + '\' is not a loader plugin');
            }
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

                logger.trace('Retrieving loader "{}" for module "{}"', [ loaderName, id ]);

                loader = getModule(loaderName, true, callerSecure, callerUrl);

                secureLoader = modules[loaderName].secureSource === true;

                if (typeof loader.load === 'function')
                {
                    loader.load(id, require, function amd__loadModule_packageLoaderCallback(value, isSecureSource)
                    {
                        if (secureLoader === true || isSecureSource === false)
                        {
                            _load(value, normalizedId, loaderName, isSecureSource);
                        }
                        else
                        {
                            throw new Error('Insecure loader module \'' + loaderName + '\' cannot declare a loaded module as secure');
                        }
                    });
                }
                else
                {
                    throw new Error('Module \'' + loaderName + '\' is not a loader plugin');
                }
            }
            else
            {
                throw new Error('Module \'' + normalizedId + '\' does not belong to any configured package - unable to load');
            }
        }
    };

    // TODO profiling shows method to be somewhat expensive - optimize e.g. by splitting into smaller, better optimizable (and profileable)
    // fragments
    getModule = function amd__getModule(normalizedId, doLoad, callerSecure, callerUrl)
    {
        var module, isSecure, moduleResult, dependency, resolvedDependencies, idx, currentlyTaggedCallerScriptUrl;

        logger.debug('Retrieving module "{}" (force load: {})', [ normalizedId, doLoad ]);

        if (normalizedId in modules && modules[normalizedId] !== null)
        {
            logger.trace('Module "{}" already defined', normalizedId);

            module = modules[normalizedId];
        }
        else if (doLoad)
        {
            logger.debug('Module "{}" not defined yet - forcing load', normalizedId);

            loadModule(normalizedId, callerSecure, callerUrl);

            if (normalizedId in modules)
            {
                logger.trace('Module "{}" defined by load', normalizedId);
                module = modules[normalizedId];
            }
            else
            {
                logger.debug('Module "{}" not defined after explicit load', normalizedId);
                // avoid repeated loads by caching null-resolution
                modules[normalizedId] = null;
                module = null;
            }
        }
        else
        {
            throw new UnavailableModuleError('Module \'' + normalizedId + '\' has not been defined');
        }

        if (isObject(module))
        {
            if (module.initialized === true)
            {
                logger.trace('Module "{}" already initialized', normalizedId);
                moduleResult = module.result;

                // special case where module was only defined to track implicit return values
                // see _load
                if (moduleResult === null && module.hasOwnProperty('implicitResult'))
                {
                    throw new UnavailableModuleError('Module \'' + normalizedId + '\' could not be loaded');
                }
            }
            else if (doLoad && module.constructing !== true)
            {
                if (typeof module.factory === 'function')
                {
                    logger.debug('Module "{}" not initialised yet - forcing initialisation', normalizedId);

                    // reset tagged caller script for call to factory
                    currentlyTaggedCallerScriptUrl = executionState.taggedCallerScriptUrl;
                    executionState.taggedCallerScriptUrl = null;

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

                            logger.trace('Resolving {} dependencies for call to factory of {}',
                                    [ module.dependencies.length, normalizedId ]);
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
                                    logger.debug('Loading dependency "{}" for module "{}"', [ module.dependencies[idx], normalizedId ]);

                                    // TODO Find a way to bind module.url/callerScriptURL context for provided modules to avoid repeated
                                    // retrievals)
                                    dependency = getModule(module.dependencies[idx], true, isSecure, module.url);

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

                        executionState.taggedCallerScriptUrl = currentlyTaggedCallerScriptUrl;
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

                        executionState.taggedCallerScriptUrl = currentlyTaggedCallerScriptUrl;

                        throw e;
                    }

                    moduleResult = module.result;
                }
                else
                {
                    throw new UnavailableModuleError('Module \'' + normalizedId + '\' could not be loaded (no factory is available)');
                }
            }
            else
            {
                throw new Error('Module \'' + normalizedId
                        + (module.constructing === true ? '\' is included in a circular dependency graph' : '\' has not been initialised'));
            }
        }
        else
        {
            throw new UnavailableModuleError('Module \'' + normalizedId + '\' could not be loaded');
        }

        checkAndFulfillModuleListeners(module);

        // TODO Refactor with check for wrapper (when we have introduced the generic module result wrapper)
        if (callerSecure !== true && isObject(moduleResult) && ('secureUseOnly' in moduleResult) && moduleResult.secureUseOnly === true)
        {
            throw new Error('Access to module \'' + normalizedId + '\' is not allowed for unsecure caller \'' + callerUrl + '\'');
        }

        if (moduleResult instanceof SecureUseOnlyWrapper)
        {
            moduleResult = moduleResult.wrapped;
        }

        return moduleResult;
    };

    checkAndFulfillModuleListeners = function amd__checkAndFulfillModuleListeners(module)
    {
        var listeners, idx, listener, dIdx, args, dependency;

        listeners = moduleListenersByModule[module.id];

        if (Array.isArray(listeners))
        {
            for (idx = 0; idx < listeners.length; idx += 1)
            {
                listener = listeners[idx];
                if (listener.triggered !== true)
                {
                    listener.resolved.push(module.id);
                    if (listener.dependencies.length === listener.resolved.length)
                    {
                        args = [];
                        for (dIdx = 0; dIdx < listener.dependencies.length; dIdx += 1)
                        {
                            dependency = getModule(listener.dependencies[dIdx], true, listener.isSecure, listener.url);
                            args.push(dependency);
                        }

                        listener.callback.apply(this, args);

                        listener.triggered = true;
                    }
                }
            }
        }
    };

    // need to select specific constructor to override basePath
    AlfrescoClasspathURLStreamHandler = Java.type('de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLStreamHandler')['(java.lang.String)'];
    streamHandler = new AlfrescoClasspathURLStreamHandler(null);

    loaderMetaLoader = {
        load : function amd__loaderMetaLoader__load(normalizedId, /* jshint unused: false */require, load)
        {
            var url = new URL('classpath', null, -1, 'de/axelfaust/alfresco/nashorn/repo/loaders/' + normalizedId, streamHandler);

            logger.debug('Loading loader module {} from classpath', normalizedId);

            load(url, true);
        }
    };

    require = function amd__require(dependencies, callback, errCallback)
    {
        var idx, args, implicitArgs, normalizedModuleId, module, contextScriptUrl, contextModule, isSecure, failOnMissingDependency, missingModule = false;

        ensureExecutionStateInit();

        // skip this script to determine script URL of caller
        contextScriptUrl = NashornUtils.getCallerScriptURL(true, false);
        contextModule = moduleByUrl[contextScriptUrl];

        isSecure = isObject(contextModule) && contextModule.secureSource === true;

        if (typeof dependencies === 'string')
        {
            logger.trace('Resolving single dependency "{}" for call to require(string)', dependencies);
            // require(string)
            normalizedModuleId = normalizeModuleId(dependencies, contextModule, contextScriptUrl);
            // MUST fail if module is not yet defined or initialised
            module = getModule(normalizedModuleId, false, isSecure, contextScriptUrl);

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
                    module = getModule(normalizedModuleId, true, isSecure, contextScriptUrl);
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
                    if (failOnMissingDependency === true || !(e instanceof UnavailableModuleError))
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
                    module = modules[normalizedModuleId];
                    if (isObject(module))
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

    require.whenAvailable = function amd__require_whenAvailable(dependencies, callback)
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

        ensureExecutionStateInit();

        // skip this script to determine script URL of caller
        contextScriptUrl = NashornUtils.getCallerScriptURL(true, false);
        contextModule = moduleByUrl[contextScriptUrl];

        isSecure = isObject(contextModule) && contextModule.secureSource === true;

        listener = Object.create(null, {
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

        // TODO check current resolution and trigger if all dependencies already resolved

        if (listener.triggered !== true)
        {
            for (idx = 0; idx < listener.dependencies.length; idx += 1)
            {
                if (!(listener.dependencies[idx] in moduleListenersByModule))
                {
                    moduleListenersByModule[listener.dependencies[idx]] = [];

                    if (NashornScriptProcessor.isInEngineContextInitialization())
                    {
                        moduleListenersByModuleBackup[listener.dependencies[idx]] = moduleListenersByModule[listener.dependencies[idx]];
                    }
                }

                moduleListenersByModule[listener.dependencies[idx]].push(listener);
            }
        }
    };

    require.config = function amd__require_config(config)
    {
        var configKeyFn, packageFn, mapFn, moduleId, moduleIds;

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

        logger.debug('Backing up AMD loader state');
        if (logger.traceEnabled)
        {
            moduleIds = [];
            for (moduleId in modules)
            {
                if (isObject(modules[moduleId]))
                {
                    moduleIds.push(moduleId);
                }
            }
            logger.trace('Backing up registered modules {}', JSON.stringify(moduleIds));
        }

        // move current module state into shared state
        for (moduleId in modules)
        {
            if (isObject(modules[moduleId]))
            {
                moduleBackup[moduleId] = modules[moduleId];
                delete modules[moduleId];
            }
        }

        for (moduleId in moduleListenersByModuleBackup)
        {
            if (Array.isArray(moduleListenersByModule[moduleId]))
            {
                moduleListenersByModuleBackup[moduleId] = moduleListenersByModule[moduleId];
                delete moduleListenersByModule[moduleId];
            }
        }

        // re-init execution state from shared state
        ensureExecutionStateInit();
    };

    require.isSecureCallerScript = function amd__require_isSecureCallerScript(suppressTaggedCaller)
    {
        var amdScriptUrl, baseUrl, contextScriptUrl, contextModule, isSecure;

        amdScriptUrl = NashornUtils.getCallerScriptURL(false, false);

        // skip this and the caller script to determine script URL of callers caller
        if (suppressTaggedCaller === true)
        {
            contextScriptUrl = NashornUtils.getCallerScriptURL(2, true);
        }
        else
        {
            contextScriptUrl = executionState.taggedCallerScriptUrl || NashornUtils.getCallerScriptURL(2, true);
        }
        contextModule = moduleByUrl[contextScriptUrl];

        if (isObject(contextModule))
        {
            isSecure = contextModule.secureSource === true;
        }
        else
        {
            // no module = insecure by default unless caller is from this script package
            baseUrl = amdScriptUrl.substring(0, amdScriptUrl.length - 'amd.js'.length);
            isSecure = contextScriptUrl.substring(0, baseUrl.length) === baseUrl;
        }

        logger.trace('Determined script "{}" to be secure: {}', [ contextScriptUrl, isSecure ]);

        return isSecure;
    };

    require.getCallerScriptURL = function amd__require_getCallerScriptURL(suppressTaggedCaller)
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

    require.getCallerScriptModuleId = function amd__require_getCallerScriptModuleId(suppressTaggedCaller)
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
        contextModule = moduleByUrl[contextScriptUrl];

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

    require.getCallerScriptModuleLoader = function amd__require_getCallerScriptModuleLoader(suppressTaggedCaller)
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
        contextModule = moduleByUrl[contextScriptUrl];

        if (isObject(contextModule))
        {
            moduleLoader = contextModule.loader;
        }

        return moduleLoader;
    };

    require.tagCallerScript = function amd__require_tagCallerScript(untaggedOnly)
    {
        var restoreFn, contextScriptUrl, actualCaller;

        actualCaller = NashornUtils.getCallerScriptURL(true, true);

        restoreFn = getRestoreTaggedCallerFn(executionState.taggedCallerScriptUrl, actualCaller);
        if (untaggedOnly === true)
        {
            contextScriptUrl = executionState.taggedCallerScriptUrl || NashornUtils.getCallerScriptURL(2, true);
        }
        else
        {
            contextScriptUrl = NashornUtils.getCallerScriptURL(2, true);
        }
        executionState.taggedCallerScriptUrl = contextScriptUrl;

        logger.debug('Script "{}" has tagged script caller as "{}"', [ actualCaller, contextScriptUrl ]);

        return restoreFn;
    };

    require.withTaggedCallerScript = function amd__require_withTaggedCallerScript(callback, untaggedOnly)
    {
        var result, restoreFn, contextScriptUrl, actualCaller;

        actualCaller = NashornUtils.getCallerScriptURL(true, true);

        if (typeof callback === 'function')
        {

            restoreFn = getRestoreTaggedCallerFn(executionState.taggedCallerScriptUrl, actualCaller);
            if (untaggedOnly === true)
            {
                contextScriptUrl = executionState.taggedCallerScriptUrl || NashornUtils.getCallerScriptURL(2, true);
            }
            else
            {
                contextScriptUrl = NashornUtils.getCallerScriptURL(2, true);
            }
            executionState.taggedCallerScriptUrl = contextScriptUrl;

            logger.debug('Script "{}" is executing function with tagged script caller "{}"', [ actualCaller, contextScriptUrl ]);

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
            logger
                    .info(
                            'Script "{}" attempted to execute function with a tagged caller script URL, but provided no callback function to execute',
                            actualCaller);
        }

        return result;
    };

    define = function amd__define()
    {
        var id, normalizedId, dependencies, factory, idx, contextScriptUrl, contextModule, module;

        ensureExecutionStateInit();

        contextScriptUrl = NashornUtils.getCallerScriptURL(true, false);
        contextModule = moduleByUrl[contextScriptUrl];

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

            if (typeof contextModule.loader === 'string'
                    && !(id.indexOf(contextModule.loader) === 0 && id.indexOf('!') !== contextModule.loader.length))
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

        module = Object.create(null, {
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

        modules[id] = module;
        if (typeof normalizedId === 'string')
        {
            modules[normalizedId] = module;
        }
        moduleByUrl[contextScriptUrl] = module;

        // if still in initialisation add to backup
        if (NashornScriptProcessor.isInEngineContextInitialization())
        {
            moduleBackup[id] = module;
            if (typeof normalizedId === 'string')
            {
                moduleBackup[normalizedId] = module;
            }
        }
    };

    // TODO Expand into a generic "asModule" supporting modifiers such as "secureUse", "clientModuleAware"...
    define.asSecureUseModule = function amd__define_asSecureUseModule(module, url)
    {
        return new SecureUseOnlyWrapper(module, url);
    };

    define.preload = function amd__define_preload(moduleId)
    {
        var normalizedModuleId, contextScriptUrl, simpleModuleId;

        ensureExecutionStateInit();

        if (moduleId === undefined || moduleId === null)
        {
            throw new Error('Module id was not provided');
        }

        if (typeof moduleId === 'string')
        {
            contextScriptUrl = NashornUtils.getCallerScriptURL(true, false);
            normalizedModuleId = normalizeModuleId(moduleId, null, contextScriptUrl, true);

            if (!(normalizedModuleId in modules))
            {
                logger.debug('Pre-loading module "{}"', normalizedModuleId);
                loadModule(normalizedModuleId, true, contextScriptUrl);

                if (normalizedModuleId in modules && typeof modules[normalizedModuleId].factory === 'function')
                {
                    getModule(normalizedModuleId, true, true, contextScriptUrl);
                }
                else if (normalizedModuleId.indexOf('!') !== -1)
                {
                    simpleModuleId = normalizedModuleId.substring(normalizedModuleId.indexOf('!') + 1);
                    if (simpleModuleId in modules && typeof modules[simpleModuleId].factory === 'function')
                    {
                        getModule(simpleModuleId, true, true, contextScriptUrl);
                    }
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
    Object.freeze(loaderMetaLoader.load);
    Object.freeze(loaderMetaLoader);
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

    modules.require = Object.create(null, {
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
    });

    modules.define = Object.create(null, {
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
    });

    modules.loaderMetaLoader = Object.create(null, {
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
    });

    Object.defineProperty(this, 'require', {
        value : require,
        enumerable : false
    });

    Object.defineProperty(this, 'define', {
        value : define,
        enumerable : false
    });
}.call(this));