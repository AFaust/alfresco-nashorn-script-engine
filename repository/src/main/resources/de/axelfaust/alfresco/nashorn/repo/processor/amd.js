(function()
{
    // core AMD state and config
    var modules = {}, moduleByUrl = {}, packages = {},
    // state backup
    moduleBackup, moduleByUrlBackup,
    // Nashorn fns
    nashornLoad = load,
    // internal fns
    normalizeSimpleId, normalizeModuleId, loadModule, getModule, _load, SecureUseOnlyWrapper,
    // public fns
    require, define;

    SecureUseOnlyWrapper = function(module)
    {
        Object.defineProperty(this, 'wrapped', {
            value : module
        });
        Object.defineProperty(this, 'secureUseOnly', {
            value : true
        });
        
        Object.freeze(this);

        return this;
    };

    normalizeSimpleId = function(id)
    {
        var fragments, result, contextScriptUrl, contextModule, moduleFragments, callers;
        if (!(typeof id === 'string'))
        {
            throw new Error('Module ID was either not provided or is not a string');
        }

        fragments = id.replace(/\\/g, '/').split('/');

        if (fragments[0] === '.' || fragments[0] === '..')
        {
            callers = [];
            // pushes this script
            callers.push(Packages.de.axelfaust.alfresco.nashorn.repo.processor.NashornUtils.getCallerScriptURL(false, false));
            // pushes either this script or any loader plugin calling normalizeSimpleId
            callers.push(Packages.de.axelfaust.alfresco.nashorn.repo.processor.NashornUtils.getCallerScriptURL(true, false));

            // retrieves context script URL by ignoring any callers from this script or the immediate loader plugin
            contextScriptUrl = Packages.de.axelfaust.alfresco.nashorn.repo.processor.NashornUtils.getCallerScriptURL(Java.to(callers, 'java.util.List'));
            contextModule = moduleByUrl[contextScriptUrl];

            if (contextModule === undefined || contextModule === null)
            {
                throw new Error('Module ID is relative but call to normalize was made outside of an active module context');
            }

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

        return result;
    };

    normalizeModuleId = function(id)
    {
        var loaderName, realId, loader, normalizedId;
        if (typeof id !== 'string')
        {
            throw new Error('Module ID was either not provided or is not a string');
        }

        if (/^[^!]+!.+$/.test(id))
        {
            loaderName = id.substring(0, id.indexOf('!'));
            realId = (id.length >= loaderName.length + 1) ? id.substring(id.indexOf('!') + 1) : '';

            loader = getModule(loaderName, true);
            if (loader === null)
            {
                throw new Error('No loader plugin named \'' + loaderName + '\' has been registered');
            }
            
            if (loader instanceof SecureUseOnlyWrapper)
            {
                loader = loader.wrapped;
            }

            if (typeof loader.normalize === 'function')
            {
                normalizedId = loaderName + '!' + loader.normalize(realId, normalizeSimpleId);
            }
            else
            {
                normalizedId = loaderName + '!' + normalizeSimpleId(realId);
            }
        }
        else
        {
            normalizedId = normalizeSimpleId(id);
        }

        return normalizedId;
    };

    _load = function(value, normalizedId, loaderName, isSecureSource)
    {
        var url;

        if (value !== undefined && value !== null)
        {
            if (value instanceof java.net.URL)
            {
                url = value;
                if (moduleByUrl.hasOwnProperty(String(url)))
                {
                    if (moduleByUrl[String(url)].id === normalizedId)
                    {
                        throw new Error('Module \'' + normalizedId + '\' in script \'' + String(url)
                                + '\' has already been loaded once - it should not have been loaded again');
                    }
                    // simply remap the existing module
                    modules[normalizedId] = modules[moduleByUrl[String(url)].id];
                }
                else
                {
                    moduleByUrl[String(url)] = {
                        id : normalizedId,
                        loader : loaderName,
                        secureSource : isSecureSource === true
                    };

                    nashornLoad(url);
                }
            }
            else
            {
                modules[normalizedId] = {
                    id : normalizedId,
                    loader : loaderName,
                    dependencies : [],
                    result : value,
                    secureSource : isSecureSource === true
                };
            }
        }
    };

    loadModule = function(normalizedId)
    {
        var id, loaderName, loader, idFragments, prospectivePackageName, length, packageConfig;

        if (/^[^!]+!.+$/.test(normalizedId))
        {
            loaderName = normalizedId.substring(0, normalizedId.indexOf('!'));
            id = normalizedId.substring(normalizedId.indexOf('!') + 1);

            loader = getModule(loaderName, true);
            
            if (loader instanceof SecureUseOnlyWrapper)
            {
                loader = loader.wrapped;
            }

            if (typeof loader.load === 'function')
            {
                loader.load(id, require, function(value, isSecureSource)
                {
                    _load(value, normalizedId, loaderName, isSecureSource);
                });
            }
            else
            {
                throw new Error('Module \'' + loaderName + '\' is not a loader plugin');
            }
        }
        else
        {
            idFragments = normalizedId.split('/');
            for (length = idFragments.length - 1; length > 0; length--)
            {
                prospectivePackageName = idFragments.slice(0, length).join('/');
                if (packages.hasOwnProperty(prospectivePackageName))
                {
                    packageConfig = packages[prospectivePackageName];
                    break;
                }
            }

            if (packageConfig !== undefined)
            {
                loaderName = packageConfig.loader;
                id = idFragments.slice(length).join('/');
                if (packageConfig.hasOwnProperty('location'))
                {
                    id = packageConfig.location + '/' + id;
                }

                loader = getModule(loaderName, true);
                
                if (loader instanceof SecureUseOnlyWrapper)
                {
                    loader = loader.wrapped;
                }

                if (typeof loader.load === 'function')
                {
                    loader.load(id, require, function(value, isSecureSource)
                    {
                        _load(value, normalizedId, loaderName, isSecureSource);
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

    getModule = function(normalizedId, doLoad)
    {
        var module, isSecure, moduleResult, dependency, resolvedDependencies, idx;

        if (modules.hasOwnProperty(normalizedId))
        {
            module = modules[normalizedId];
        }
        else if (doLoad)
        {
            loadModule(normalizedId);

            if (modules.hasOwnProperty(normalizedId))
            {
                module = modules[normalizedId];
            }
            else
            {
                // avoid repeated loads by caching null-resolution
                modules[normalizedId] = null;
                module = null;
            }
        }
        else
        {
            throw new Error('Module \'' + normalizedId + '\' has not been defined');
        }

        if (module !== undefined && module !== null)
        {
            if (module.hasOwnProperty('result'))
            {
                moduleResult = module.result;
            }
            else if (doLoad && module.constructing !== true)
            {
                module.constructing = true;
                try
                {
                    if (module.dependencies.length === 0)
                    {
                        module.result = module.factory();
                    }
                    else
                    {
                        isSecure = module.secureSource === true;

                        for (idx = 0, resolvedDependencies = []; idx < module.dependencies.length; idx++)
                        {
                            if (module.dependencies[idx] === 'exports')
                            {
                                module.result = {};
                                resolvedDependencies.push(module.result);
                            }
                            else
                            {
                                dependency = getModule(module.dependencies[idx], true);

                                if (isSecure === false && dependency !== null && dependency.hasOwnProperty('secureUseOnly')
                                        && dependency.secureUseOnly === true)
                                {
                                    throw new Error('Access to module \'' + module.dependencies[idx]
                                            + '\' is not allowed for unsecure caller \'' + module.url + '\'');
                                }

                                if (dependency instanceof SecureUseOnlyWrapper)
                                {
                                    dependency = dependency.wrapped;
                                }

                                resolvedDependencies.push(dependency);
                            }
                        }

                        if (module.hasOwnProperty('result'))
                        {
                            module.factory.apply(this, resolvedDependencies);
                        }
                        else
                        {
                            module.result = module.factory.apply(this, resolvedDependencies);
                        }
                    }
                    module.constructing = false;
                }
                catch (e)
                {
                    module.constructing = false;
                    throw e;
                }
                moduleResult = module.result;
            }
            else if (module.constructing === true)
            {
                throw new Error('Module \'' + normalizedId + '\' is included in a circular dependency graph');
            }
            else
            {
                throw new Error('Module \'' + normalizedId + '\' has not been initialised');
            }
        }
        else
        {
            throw new Error('Module \'' + normalizedId + '\' could not be loaded');

        }
        return moduleResult;
    };

    require = function(dependencies, callback)
    {
        var idx, args, normalizedModuleId, module, contextScriptUrl, contextModule, isSecure;

        // skip this script to determine script URL of caller
        contextScriptUrl = Packages.de.axelfaust.alfresco.nashorn.repo.processor.NashornUtils.getCallerScriptURL(true, false);
        contextModule = moduleByUrl[contextScriptUrl];

        isSecure = contextModule !== undefined && contextModule !== null && contextModule.secureSource === true;

        if (typeof dependencies === 'string')
        {
            // require(string)
            normalizedModuleId = normalizeModuleId(dependencies);
            // MUST fail if module is not yet defined or initialised
            module = getModule(normalizedModuleId, false);

            if (isSecure === false && module !== null && module.hasOwnProperty('secureUseOnly') && module.secureUseOnly === true)
            {
                throw new Error('Access to module \'' + normalizedModuleId + '\' is not allowed for unsecure caller \'' + contextScriptUrl
                        + '\'');
            }

            if (module instanceof SecureUseOnlyWrapper)
            {
                module = module.wrapped;
            }

            return module;
        }

        if (Array.isArray(dependencies))
        {
            for (idx = 0, args = []; idx < dependencies.length; idx++)
            {
                normalizedModuleId = normalizeModuleId(dependencies[idx]);

                module = getModule(normalizedModuleId, true);

                if (isSecure === false && module !== null && module.hasOwnProperty('secureUseOnly') && module.secureUseOnly === true)
                {
                    throw new Error('Access to module \'' + normalizedModuleId + '\' is not allowed for unsecure caller \''
                            + contextScriptUrl + '\'');
                }

                if (module instanceof SecureUseOnlyWrapper)
                {
                    module = module.wrapped;
                }

                args.push(module);
            }

            if (typeof callback === 'function')
            {
                callback.apply(this, args);
            }

            return args;
        }
    };

    require.config = function(config)
    {
        var key, packageConfigs, idx, singlePackageConfig, packName, packLoader, packLocation;
        if (config === undefined || config === null || typeof config !== 'object')
        {
            throw new Error('Invalid config parameter');
        }

        try
        {
            for (key in config)
            {
                if (config.hasOwnProperty(key))
                {
                    switch (key)
                    {
                        case 'packages':
                            packageConfigs = config[key];
                            if (Array.isArray(packageConfigs))
                            {
                                for (idx = 0; idx < packageConfigs.length; idx++)
                                {
                                    singlePackageConfig = packageConfigs[idx];

                                    if (singlePackageConfig === null || typeof singlePackageConfig !== 'object')
                                    {
                                        throw new Error('Invalid package config structure');
                                    }

                                    packName = singlePackageConfig.name || null;
                                    packLoader = singlePackageConfig.loader || null;
                                    packLocation = singlePackageConfig.location || null;

                                    if (packName === null || typeof packName !== 'string'
                                            || !/^(?:\w|[\-_.])+(?:\/(?:\w|[\-_.])+)*$/.test(packName))
                                    {
                                        throw new Error('Package name has not been set or is not a valid string');
                                    }

                                    if (packages.hasOwnProperty(packName))
                                    {
                                        // should not occur due to one-shot operation
                                        throw new Error('Package \'' + packName + '\' has already been defined');
                                    }

                                    if (packLoader === null || typeof packLoader !== 'string'
                                            || !/^(?:\w|[\-_.])+(?:\/(?:\w|[\-_.])+)*$/.test(packLoader))
                                    {
                                        throw new Error('Loader name for package \'' + packName
                                                + '\' has not been set or is not a valid string');
                                    }

                                    packages[packName] = {
                                        name : packName,
                                        loader : packLoader
                                    };

                                    if (packLocation !== null && typeof packLocation === 'string')
                                    {
                                        // TODO Can we relax this? Location is intended to be a virtual prefix to the module ID, so it needs
                                        // to conform to same rules we apply on packLoader as module ID
                                        if (!/^(?:\w|[\-_.])+(?:\/(?:\w|[\-_.])+)*$/.test(packLocation))
                                        {
                                            throw new Error('Location for for package \'' + packName + '\' is not a valid string');
                                        }
                                        packages[packName].location = packLocation;
                                    }
                                }
                            }
                            break;
                        default: // unsupported option - ignore silently
                    }
                }
            }
        }
        catch (e)
        {
            // reset to preserve pristine state
            packages = {};
            throw e;
        }

        // config is a one-shot operation and finalizes AMD framework
        // remove option for further config
        delete require.config;

        // backup current module state
        moduleBackup = modules;
        moduleByUrlBackup = moduleByUrl;

        modules = {};
        moduleByUrl = {};
        for (key in moduleBackup)
        {
            if (moduleBackup.hasOwnProperty(key))
            {
                modules[key] = moduleBackup[key];
            }
        }
        for (key in moduleByUrlBackup)
        {
            if (moduleByUrlBackup.hasOwnProperty(key))
            {
                moduleByUrl[key] = moduleByUrlBackup[key];
            }
        }
    };

    require.reset = function()
    {
        var key;

        modules = {};
        moduleByUrl = {};

        if (moduleBackup !== undefined && moduleByUrlBackup !== undefined)
        {
            for (key in moduleBackup)
            {
                if (moduleBackup.hasOwnProperty(key))
                {
                    modules[key] = moduleBackup[key];
                }
            }
            for (key in moduleByUrlBackup)
            {
                if (moduleByUrlBackup.hasOwnProperty(key))
                {
                    moduleByUrl[key] = moduleByUrlBackup[key];
                }
            }
        }
    };

    require.isSecureCallerScript = function()
    {
        var contextScriptUrl, contextModule, isSecure;

        // skip this and the caller script to determine script URL of callers caller
        contextScriptUrl = Packages.de.axelfaust.alfresco.nashorn.repo.processor.NashornUtils.getCallerScriptURL(2, true);
        contextModule = moduleByUrl[contextScriptUrl];

        isSecure = contextModule !== undefined && contextModule !== null && contextModule.secureSource === true;

        return isSecure;
    };

    define = function()
    {
        var id, dependencies, factory, idx, contextScriptUrl, contextModule;

        contextScriptUrl = Packages.de.axelfaust.alfresco.nashorn.repo.processor.NashornUtils.getCallerScriptURL(true, false);
        contextModule = moduleByUrl[contextScriptUrl];

        for (idx = 0; idx < arguments.length; idx++)
        {
            if (idx === 0 && id === undefined && dependencies === undefined && factory === undefined && typeof arguments[idx] === 'string')
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

        if (id === undefined && contextModule !== undefined && contextModule !== null)
        {
            id = contextModule.id;
        }

        if (dependencies === undefined)
        {
            // we don't default to standard dependencies of CommonJS (["require", "exports", "module"})
            dependencies = [];
        }

        for (idx = 0; idx < dependencies.length; idx++)
        {
            if (typeof dependencies[idx] !== 'string')
            {
                throw new Error('Dependency identifier is not a string');
            }

            dependencies[idx] = normalizeModuleId(dependencies[idx]);
        }

        if (id === undefined || id === null)
        {
            throw new Error('Module id could not be infered');
        }

        if (factory === undefined || factory === null)
        {
            throw new Error('Module factory was not provided');
        }

        modules[id] = {
            id : id,
            loader : contextModule !== undefined && contextModule !== null ? contextModule.loader : null,
            dependencies : dependencies,
            factory : factory,
            url : contextScriptUrl,
            secureSource : contextModule !== undefined && contextModule !== null ? contextModule.secureSource : false
        };
        moduleByUrl[contextScriptUrl] = modules[id];
    };

    define.asSecureUseModule = function(module)
    {
        return new SecureUseOnlyWrapper(module);
    };
    
    define.preload = function(moduleId)
    {
        var normalizedModuleId;

        if (moduleId === undefined || moduleId === null)
        {
            throw new Error('Module id was not provided');
        }

        if (typeof moduleId === 'string')
        {
            normalizedModuleId = normalizeModuleId(moduleId);

            if (!modules.hasOwnProperty(normalizedModuleId))
            {
                loadModule(normalizedModuleId);
            }
        }
        else
        {
            throw new Error('Module id is not a string');
        }
    };

    // mininum object to identify define as AMD compatible
    define.amd = {};

    modules.require = {
        id : 'require',
        result : require,
        url : Packages.de.axelfaust.alfresco.nashorn.repo.processor.NashornUtils.getCallerScriptURL(false, false)
    };

    modules.define = {
        id : 'define',
        result : define,
        url : Packages.de.axelfaust.alfresco.nashorn.repo.processor.NashornUtils.getCallerScriptURL(false, false)
    };

    Object.defineProperty(this, 'require', {
        value : require
    });

    Object.defineProperty(this, 'define', {
        value : define
    });
}());