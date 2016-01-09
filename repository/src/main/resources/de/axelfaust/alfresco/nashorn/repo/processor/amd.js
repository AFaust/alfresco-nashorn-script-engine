(function amd()
{
    'use strict';

    // core AMD state and config
    var modules = {}, moduleByUrl = {}, mappings = {}, moduleListenersByModule = {}, moduleListeners = [], packages = {},
    // state backup
    moduleBackup, moduleListenersBackup,
    // Nashorn fns
    nashornLoad = load,
    // internal fns
    isObject, normalizeSimpleId, normalizeModuleId, mapModuleId, loadModule, getModule, checkAndFulfillModuleListeners, _load, SecureUseOnlyWrapper, clone,
    // internal error subtype
    UnavailableModuleError,
    // Java utils
    NashornUtils, Throwable, URL, AlfrescoClasspathURLStreamHandler, streamHandler, logger,
    // meta loader module
    loaderMetaLoader,
    // public fns
    require, define;

    NashornUtils = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornUtils');
    Throwable = Java.type('java.lang.Throwable');
    URL = Java.type('java.net.URL');
    logger = Java.type('org.slf4j.LoggerFactory').getLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.amd');

    UnavailableModuleError = function amd__UnavailableModuleError(message)
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

    SecureUseOnlyWrapper = function amd__SecureUseOnlyWrapper_constructor(module)
    {
        Object.defineProperty(this, 'wrapped', {
            value : module,
            enumerable : true
        });
        Object.defineProperty(this, 'secureUseOnly', {
            value : true,
            enumerable : true
        });

        Object.freeze(this);

        return this;
    };

    clone = function amd__clone(obj, protectedKeys)
    {
        var result, desc;

        if (obj === undefined || obj === null)
        {
            result = obj;
        }
        else if (Array.isArray(obj))
        {
            result = [];
            obj.forEach(function amd__clone_arrElement(element)
            {
                result.push(clone(element, protectedKeys));
            }, this);
        }
        else if (isObject(obj))
        {
            result = {};
            Object.getOwnPropertyNames(obj).forEach(function amd__clone_objKey(key)
            {
                desc = Object.getOwnPropertyDescriptor(obj, key);
                Object.defineProperty(result, key, {
                    value : (isObject(protectedKeys) && protectedKeys[key]) === true ? obj[key] : clone(obj[key], protectedKeys),
                    writable : desc.writable,
                    configurable : desc.configurable,
                    enumerable : desc.enumerable
                });
            }, this);
        }
        else
        {
            // assume simple / literal values
            result = obj;
        }

        return result;
    };

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

                            logger.trace('Mapped module id {} to {} via mapping of package {}', moduleId, result, lookup);
                        }
                    }
                }
            }
        }
        else if (mappings.hasOwnProperty('*'))
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

                    logger.trace('Mapped module id {} to {} via asterisk mapping', moduleId, result);
                }
            }
        }

        return result;
    };

    normalizeSimpleId = function amd__normalizeSimpleId(id, contextModule)
    {
        var fragments, result, moduleFragments;

        if (!(typeof id === 'string'))
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

            logger.trace('Simple id "{}" will be resolved against context module "{}"', id, contextModule.id);

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

                    moduleFragments.shift();
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

        logger.trace('Normalized simple id "{}" to "{}"', id, result);

        return result;
    };

    normalizeModuleId = function amd__normalizeModuleId(id, contextModule, contextUrl, forceIsSecure)
    {
        var loaderName, realId, loader, normalizedId, isSecure;
        if (typeof id !== 'string')
        {
            throw new Error('Module ID was either not provided or is not a string');
        }

        logger.trace('Normalizing module id "{}"', id);

        if (/^[^!]+!.+$/.test(id))
        {
            loaderName = id.substring(0, id.indexOf('!'));
            realId = (id.length >= loaderName.length + 1) ? id.substring(id.indexOf('!') + 1) : '';

            logger.trace('Retrieving loader "{}" for module "{}"', loaderName, id);

            isSecure = forceIsSecure === true || (isObject(contextModule) && contextModule.secureSource === true);
            loader = getModule(loaderName, true, isSecure, isObject(contextModule) ? contextModule.url : contextUrl);
            if (loader === null)
            {
                throw new Error('No loader plugin named \'' + loaderName + '\' has been registered');
            }

            if (typeof loader.normalize === 'function')
            {
                logger.trace('Calling normalize-function of loader "{}"', loaderName);
                // TODO Protect against loader manipulating the contextModule
                normalizedId = loaderName + '!' + loader.normalize(realId, normalizeSimpleId, contextModule);
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

    _load = function amd__load(value, normalizedId, loaderName, isSecureSource)
    {
        var url, module, implicitResult;

        if (value !== undefined && value !== null)
        {
            if (value instanceof URL)
            {
                url = value;
                if (moduleByUrl.hasOwnProperty(String(url)))
                {
                    if (moduleByUrl[String(url)].id === normalizedId)
                    {
                        throw new Error('Module \'' + normalizedId + '\' in script \'' + String(url)
                                + '\' has already been loaded once - it should not have been loaded again');
                    }

                    logger.trace('Remapping already loaded module "{}" from url "{}"', normalizedId, url);

                    // simply remap the existing module
                    modules[normalizedId] = modules[moduleByUrl[String(url)].id];
                }
                else
                {
                    logger.debug('Loading module "{}" from url "{}" (secure: {})', normalizedId, url, isSecureSource === true);

                    module = {};

                    Object.defineProperty(module, 'id', {
                        value : normalizedId,
                        enumerable : true
                    });

                    Object.defineProperty(module, 'loader', {
                        value : loaderName,
                        enumerable : true
                    });

                    Object.defineProperty(module, 'secureSource', {
                        value : isSecureSource === true,
                        enumerable : true
                    });

                    moduleByUrl[String(url)] = module;

                    implicitResult = nashornLoad(url);
                    // script may not define a module
                    // we store the result of script execution for require(dependencies[], successFn, errorFn)
                    logger.debug('Module "{}" from url "{}" yielded implicit result "{}"', normalizedId, url, implicitResult);

                    Object.defineProperty(module, 'implicitResult', {
                        value : implicitResult,
                        enumerable : true
                    });

                    // no module defined yet by requested module id
                    // may be a non-module script with implicit return value or define
                    if (!modules.hasOwnProperty(normalizedId))
                    {
                        if (!module.hasOwnProperty('dependencies'))
                        {
                            Object.defineProperty(module, 'dependencies', {
                                value : [],
                                enumerable : true
                            });
                        }
                        modules[normalizedId] = module;
                    }
                }
            }
            else
            {
                logger.debug('Registering pre-resolved module "{}"', normalizedId);

                module = {};

                Object.defineProperty(module, 'id', {
                    value : normalizedId,
                    enumerable : true
                });

                Object.defineProperty(module, 'loader', {
                    value : loaderName,
                    enumerable : true
                });

                Object.defineProperty(module, 'dependencies', {
                    value : [],
                    enumerable : true
                });

                Object.defineProperty(module, 'result', {
                    value : value,
                    enumerable : true
                });

                Object.defineProperty(module, 'secureSource', {
                    value : isSecureSource === true,
                    enumerable : true
                });

                Object.freeze(module.dependencies);

                modules[normalizedId] = module;
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

            logger.trace('Retrieving loader "{}" for module "{}"', loaderName, id);

            loader = getModule(loaderName, true, callerSecure, callerUrl);

            secureLoader = modules[loaderName].secureSource === true;

            if (typeof loader.load === 'function')
            {
                loader.load(id, require, function amd__loadModule_explicitLoaderCallback(value, isSecureSource)
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

                logger.trace('Retrieving loader "{}" for module "{}"', loaderName, id);

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

    getModule = function amd__getModule(normalizedId, doLoad, callerSecure, callerUrl)
    {
        var module, isSecure, moduleResult, dependency, resolvedDependencies, idx;

        logger.debug('Retrieving module "{}" (force load: {})', normalizedId, doLoad);

        if (modules.hasOwnProperty(normalizedId))
        {
            logger.trace('Module "{}" already defined', normalizedId);
            module = modules[normalizedId];
        }
        else if (doLoad)
        {
            logger.debug('Module "{}" not defined yet - forcing load', normalizedId);

            loadModule(normalizedId, callerSecure, callerUrl);

            if (modules.hasOwnProperty(normalizedId))
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
            if (module.hasOwnProperty('result'))
            {
                logger.trace('Module "{}" already initialised', normalizedId);
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
                    module.constructing = true;
                    try
                    {
                        if (module.dependencies.length === 0)
                        {
                            logger.trace('Module "{}" has no dependencies - calling factory', normalizedId);

                            Object.defineProperty(module, 'result', {
                                value : module.factory(),
                                enumerable : true
                            });
                        }
                        else
                        {
                            isSecure = module.secureSource === true;

                            resolvedDependencies = [];
                            for (idx = 0; idx < module.dependencies.length; idx += 1)
                            {
                                if (module.dependencies[idx] === 'exports')
                                {
                                    logger
                                            .trace(
                                                    'Module "{}" uses "exports"-dependency to expose module during initialisation (avoiding circular dependency issues)',
                                                    normalizedId);
                                    Object.defineProperty(module, 'result', {
                                        value : {},
                                        enumerable : true
                                    });
                                    resolvedDependencies.push(module.result);
                                }
                                else
                                {
                                    logger.debug('Loading dependency "{}" for module "{}"', module.dependencies[idx], normalizedId);

                                    dependency = getModule(module.dependencies[idx], true, isSecure, module.url);

                                    resolvedDependencies.push(dependency);
                                }
                            }

                            logger.trace('All dependencies of module "{}" resolved - calling factory', normalizedId);
                            if (module.hasOwnProperty('result'))
                            {
                                module.factory.apply(this, resolvedDependencies);
                            }
                            else
                            {
                                Object.defineProperty(module, 'result', {
                                    value : module.factory.apply(this, resolvedDependencies),
                                    enumerable : true
                                });
                            }
                        }
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
                        module.constructing = false;
                        throw e;
                    }

                    moduleResult = module.result;
                }
                // special case where module was only defined to track implicit return values
                // see _load
                else if (module.hasOwnProperty('implicitResult'))
                {
                    throw new UnavailableModuleError('Module \'' + normalizedId + '\' could not be loaded');
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

        if (callerSecure !== true && moduleResult !== undefined && moduleResult !== null && moduleResult.secureUseOnly === true)
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
        load : function amd__loaderMetaLoader__load(normalizedId, require, load)
        {
            var url = new URL('classpath', null, -1, 'de/axelfaust/alfresco/nashorn/repo/loaders/' + normalizedId, streamHandler);

            logger.debug('Loading loader module {} from classpath', normalizedId);

            load(url, true);
        }
    };

    require = function amd__require(dependencies, callback, errCallback)
    {
        var idx, args, implicitArgs, normalizedModuleId, module, contextScriptUrl, contextModule, isSecure, failOnMissingDependency, missingModule = true;

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
                logger.trace('Resolving dependency "{}" for call to require(string[])', dependencies[0]);
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

                args.push(module);

                if (module === undefined || module === null)
                {
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

                    logger.trace('Added implicit module result "{}" for call to require(string[], function, function?',
                            implicitArgs[implicitArgs.length - 1]);
                }
            }

            if (missingModule === true)
            {
                // if errCallback is not a function we'd have failed during resolution instead of ending here
                // signature is fn(dependencies[], moduleResolutions[], implicitResolutions[])
                errCallback.call(this, dependencies, args, implicitArgs);
            }
            else if (typeof callback === 'function')
            {
                callback.apply(this, args);
            }
            else
            {
                throw new Error('No success callback was provided');
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

        // skip this script to determine script URL of caller
        contextScriptUrl = NashornUtils.getCallerScriptURL(true, false);
        contextModule = moduleByUrl[contextScriptUrl];

        isSecure = isObject(contextModule) && contextModule.secureSource === true;

        listener = {
            isSecure : isSecure,
            url : contextScriptUrl,
            callback : callback,
            resolved : [],
            dependencies : [],
            triggered : false
        };

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

        if (logger.traceEnabled)
        {
            logger.trace('Registered listener from url "{}" (secure: {}) for modules {}', contextScriptUrl, isSecure, JSON
                    .stringify(listener.dependencies));
        }
        else
        {
            logger.trace('Registered listener from url "{}" (secure: {})', contextScriptUrl, isSecure);
        }

        // TODO check current resolution and trigger if all dependencies already resolved

        if (listener.triggered !== true)
        {
            for (idx = 0; idx < listener.dependencies.length; idx += 1)
            {
                if (!moduleListenersByModule.hasOwnProperty(listener.dependencies[idx]))
                {
                    moduleListenersByModule[listener.dependencies[idx]] = [];
                }

                moduleListenersByModule[listener.dependencies[idx]].push(listener);
            }
        }
    };

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
                mappings[sourcePrefix] = clone(map[sourcePrefix]);
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

            logger.trace('Adding AMD package "{}" using loader "{}" (package location: {})', packName, packLoader, packLocation);

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
            logger.trace('Backing up registered modules {}', JSON.stringify(Object.keys(modules)));
        }

        // backup current module state
        moduleBackup = modules;
        moduleListenersBackup = moduleListeners;

        // clone
        modules = clone(moduleBackup, {
            result : true
        });
        moduleByUrl = {};
        moduleListeners = clone(moduleListenersBackup);
        moduleListenersByModule = {};

        // prepare by-reference structures
        Object.keys(modules).forEach(function amd__require_config_prepareModules(moduleId)
        {
            if (modules[moduleId].url !== undefined && modules[moduleId].url !== null)
            {
                moduleByUrl[String(modules[moduleId].url)] = modules[moduleId];
            }
        }, this);

        moduleListeners.forEach(function amd__require_config_prepareListeners(moduleListener)
        {
            var idx;
            for (idx = 0; idx < moduleListener.dependencies; idx += 1)
            {
                if (!moduleListenersByModule.hasOwnProperty(moduleListener.dependencies[idx]))
                {
                    moduleListenersByModule[moduleListener.dependencies[idx]] = [];
                }

                moduleListenersByModule[moduleListener.dependencies[idx]].push(moduleListener);
            }
        }, this);
    };

    require.reset = function amd__require_reset()
    {
        logger.debug('Resetting AMD loader state to backup');

        // clone
        modules = isObject(moduleBackup) ? clone(moduleBackup, {
            result : true
        }) : {};
        moduleByUrl = {};
        moduleListeners = isObject(moduleListenersBackup) ? clone(moduleListenersBackup) : [];
        moduleListenersByModule = {};

        // prepare by-reference structures
        Object.keys(modules).forEach(function amd__require_reset_modules(moduleId)
        {
            if (modules[moduleId].url !== undefined && modules[moduleId].url !== null)
            {
                moduleByUrl[String(modules[moduleId].url)] = modules[moduleId];
            }
        }, this);

        moduleListeners.forEach(function amd__require_reset_listeners(moduleListener)
        {
            var idx = 0;
            for (idx = 0; idx < moduleListener.dependencies; idx += 1)
            {
                if (!moduleListenersByModule.hasOwnProperty(moduleListener.dependencies[idx]))
                {
                    moduleListenersByModule[moduleListener.dependencies[idx]] = [];
                }

                moduleListenersByModule[moduleListener.dependencies[idx]].push(moduleListener);
            }
        }, this);

        if (logger.traceEnabled)
        {
            logger.trace('Restored modules {} from backup', JSON.stringify(Object.keys(modules)));
        }
    };

    require.isSecureCallerScript = function amd__require_isSecureCallerScript()
    {
        var contextScriptUrl, contextModule, isSecure;

        // skip this and the caller script to determine script URL of callers caller
        contextScriptUrl = NashornUtils.getCallerScriptURL(2, true);
        contextModule = moduleByUrl[contextScriptUrl];

        isSecure = isObject(contextModule) && contextModule.secureSource === true;

        logger.trace('Determined script "{}" to be secure: {}', contextScriptUrl, isSecure);

        return isSecure;
    };

    require.getCallerScriptURL = function amd__require_getCallerScriptURL()
    {
        var contextScriptUrl;

        // skip this and the caller script to determine script URL of callers caller
        contextScriptUrl = NashornUtils.getCallerScriptURL(2, true);

        return contextScriptUrl;
    };

    require.getCallerScriptModuleId = function amd__require_getCallerScriptModuleId()
    {
        var contextScriptUrl, contextModule, moduleId;

        // skip this and the caller script to determine script URL of callers caller
        contextScriptUrl = NashornUtils.getCallerScriptURL(2, true);
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

    require.getCallerScriptModuleLoader = function amd__require_getCallerScriptModuleLoader()
    {
        var contextScriptUrl, contextModule, moduleLoader;

        // skip this and the caller script to determine script URL of callers caller
        contextScriptUrl = NashornUtils.getCallerScriptURL(2, true);
        contextModule = moduleByUrl[contextScriptUrl];

        if (isObject(contextModule))
        {
            moduleLoader = contextModule.loader;
        }

        return moduleLoader;
    };

    define = function amd__define()
    {
        var id, dependencies, factory, idx, contextScriptUrl, contextModule, module;

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

        if (id === undefined && isObject(contextModule))
        {
            id = contextModule.id;
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
            logger.trace('Defining module "{}" from url "{}" with dependencies {} (secureSource: {})', id, contextScriptUrl, JSON
                    .stringify(dependencies), isObject(contextModule) ? contextModule.secureSource : false);
        }
        else
        {
            logger.debug('Defining module "{}" from url "{}" (secureSource: {})', id, contextScriptUrl,
                    isObject(contextModule) ? contextModule.secureSource : false);
        }

        module = {};

        Object.defineProperty(module, 'id', {
            value : id,
            enumerable : true
        });

        Object.defineProperty(module, 'loader', {
            value : isObject(contextModule) ? contextModule.loader : null,
            enumerable : true
        });

        Object.defineProperty(module, 'dependencies', {
            value : dependencies,
            enumerable : true
        });

        Object.defineProperty(module, 'factory', {
            value : factory,
            enumerable : true
        });

        Object.defineProperty(module, 'url', {
            value : contextScriptUrl,
            enumerable : true
        });

        Object.defineProperty(module, 'secureSource', {
            value : isObject(contextModule) ? contextModule.secureSource : false,
            enumerable : true
        });

        Object.freeze(dependencies);

        modules[id] = module;
        moduleByUrl[contextScriptUrl] = module;
    };

    define.asSecureUseModule = function amd__define_asSecureUseModule(module)
    {
        return new SecureUseOnlyWrapper(module);
    };

    define.preload = function amd__define_preload(moduleId)
    {
        var normalizedModuleId, contextScriptUrl;

        if (moduleId === undefined || moduleId === null)
        {
            throw new Error('Module id was not provided');
        }

        if (typeof moduleId === 'string')
        {
            contextScriptUrl = NashornUtils.getCallerScriptURL(true, false);
            normalizedModuleId = normalizeModuleId(moduleId, null, contextScriptUrl, true);

            if (!modules.hasOwnProperty(normalizedModuleId))
            {
                logger.debug('Pre-loading module "{}"', normalizedModuleId);
                loadModule(normalizedModuleId, true, contextScriptUrl);
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
    Object.freeze(require.reset);
    // require / require.config can't be frozen yet
    Object.freeze(define.asSecureUseModule);
    Object.freeze(define.preload);
    Object.freeze(define.amd);
    Object.freeze(define);

    modules.require = {
        id : 'require',
        secureSource : true,
        result : require,
        url : NashornUtils.getCallerScriptURL(false, false)
    };

    modules.define = {
        id : 'define',
        secureSource : true,
        result : define,
        url : NashornUtils.getCallerScriptURL(false, false)
    };

    modules.loaderMetaLoader = {
        id : 'loaderMetaLoader',
        secureSource : true,
        result : loaderMetaLoader,
        url : NashornUtils.getCallerScriptURL(false, false)
    };

    Object.defineProperty(this, 'require', {
        value : require,
        enumerable : false
    });

    Object.defineProperty(this, 'define', {
        value : define,
        enumerable : false
    });
}.call(this));