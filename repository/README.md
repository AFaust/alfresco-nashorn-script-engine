# Nashorn Script Processor
This module adds an additional script processor to the Repository-tier [ScriptService](http://dev.alfresco.com/resource/docs/java/org/alfresco/service/cmr/repository/ScriptService.html). The ScriptService will use the name of the script about to be executed to pick the correct script engine, if the engine is not specified as a parameter. The Nashorn engine has been registered to be automatically used with any script that uses the file extension `nashornjs` (the file extension `js` is already associated with the default Rhino script engine). Alternatively, it can be forced to be used for any script by providing the `engine` parameter with the value of `nashorn`.

# Nashorn-backed web scripts
The web script framework has been designed to be technically agnostic with regards to the script engine to be used, even though over time too much Rhino-specifics have seeped into the web script layer. Nevertheless, the web script framework will automatically detect and execute JavaScript web script controllers with the Nashorn engines as long as they use the `nashornjs` file extension, so i.e. `my-script.get.nashornjs` or `my-script.json.post.nashornjs`.

# Concepts
The Nashorn script engine has been implemented with the following base concepts:

- modularisation is supported out-of-the-box and importing other modules (script files) is possible via native APIs
- use of modularisation / AMD API is optional
- script file inclusion / resolution via the modularisation / AMD API relaxes the `nashornjs` file extension requirement and allows script files to have either one of `js` or `nashornjs` as the file extension - or no file extension at all
- the script API can be extended / customized by using only JavaScript, defined file structures that allow customer overrides via the familiar `extension` directory pattern, and module-specific `alfresco-global.properties` settings (XML-free configuration)
- the default script API is composed of granular modules and mixins instead of monolithic Java classes, and supports using custom modules instead of the default ones to construct result values (i.e. use a custom ScriptNode module instead of the out-of-the-box one for a specific query result)
- access to secure-use-only modules / features is checked on a per-module basis instead of a per-execution basis in the Rhino integration (i.e. insecure scripts can depend on secure scripts that will have access to secure-use-only modules / features)
- all scripts share a single global, immutable scope (modules may internally use execution-aware data structures provided by [NashornScriptModel](https://github.com/AFaust/alfresco-nashorn-script-engine/blob/master/repository/src/main/java/de/axelfaust/alfresco/nashorn/repo/processor/NashornScriptModel.java))
- all scripts (except some core initialisation scripts) run in `"use strict;"` mode

# Script paths
The following (abstract) paths are used by this module to handle scripts for specific purposes:

- *classpath:alfresco/templates/webscripts/path/to/my/webscript.\*.nashornjs* - regular path for web script controller scripts
- *classpath\*:alfresco/extension/templates/webscripts/path/to/my/webscript.\*.nashornjs* - regular path for web script controller script overrides
- *classpath:alfresco/scripts/nashorn/alfresco/my/module(.(nashorn)?js)?* - path for script modules  in the **alfresco** package, in this case the module with ID *alfresco/my/module* (custom package names are technically supported though convenient configuration is an open TODO)
- *classpath\*:alfresco/extension/scripts/nashorn/alfresco/my/module(.(nashorn)?js)?* - override path for script modules  in the **alfresco** package, in this case the module with ID *alfresco/my/module*

The modularisation / AMD API technically allows to load scripts from any source as long as a corresponding module loader has been registered, i.e. the default *classpath* module loader allows to load script files from any classpath-accessible file structure.

# Modularisation
Every script is technically loaded as a module though it isn't forced to use the modularisation / AMD API. Modules are a way of separating functionality into re-useable components with defined dependencies. The inclusion of modularisation in the design of the Nashorn script engine is based on the fact that the initial compilation and continueing optimisation of JavaScript code can be quite expensive. By promoting reuse of blocks of functionality, fewer code needs to be compiled and more code paths may be more optimized by being shared in multiple script executions.
Though the modularisation within the engine is exposed via an AMD-like API, the modularisation mechanisms aren't strictly the same as in AMD: modules aren't loaded asynchronously in the sense of how AMD loads script files asynchronously within browsers.

### Defining a module
A module may be defined in any script file via the `define` root scope function.

```javascript
define([ 'dependency/module/a', 'dependency/module/b', 'dependency/module/c' ], function (A, B, C)
{
    var module = {};
    // add features (properties / functions) to module
    return module;
});
```

The `define` function can be invoked with the following arguments:

- `id` - optional first argument specifying an explicit module ID; if not provided the module ID will be the ID another script used to cause the script file to be loaded (implicit module ID)
- `dependencies` -  the optional list of module IDs for required dependencies; each of the listed modules will be loaded (if not loaded already) and passed to the module factory; if any dependency cannot be loaded an error will be thrown when client code requires this module or another module that transitively depends on it; module IDs can be in relative form (i.e. `./d` to refer to the module *d* in the same package as the module to be defined)
- `factory` - the factory function to initialise the value of the module; this function will only be called once either in response to client code requiring this module or another module that transitively depends on it

### Requiring a module
The easiest way to define dependencies / requirements on specific modules to be loaded is by including the IDs in the call to `define`. In some cases however one may need to load an optional dependency or a module based on a dynamically provided module ID. In this case the `require` root scope function may be used. If the call to `require` is part of a modules functionality it is recommended to have the module depend on the `require` module which will provide the same function as the root scope one, but the function will be bound to the modules context which can improve performance for access checks (if script is allowed to access the required module).

```javascript
// global require of single, already initialized module
var moduleA = require('dependency/module/a'); // will fail if module has not been initialised yet

// global require of (potentially) multiple, (potentially) uninitialised module(s)
// variant a) will fail if modules cannot be loaded
require([ 'dependency/module/a', 'dependency/module/b', 'dependency/module/c' ], function(A, B, C){
    // do something with A, B or C
});

// variant b) secondary callback will be invoked if one or more modules cannot be loaded
require([ 'dependency/module/a', 'dependency/module/b', 'dependency/module/c' ], function(A, B, C){
    // do something with A, B or C
}, function (dependencies, resolvedModules, implicitResults){
    // dependecies is identical to 1st argument to require
    // resolvedModules is list of modules that have been loaded succesfully in order of dependencies (null if module could not be loaded)
    // implicitResults is list of last return value from executing the module script file (if found)

    // handle error case
});

// module-specific require
define([ 'dependency/module/a', 'dependency/module/b', 'dependency/module/c', 'require' ], function(A, B, C, require){
    var module, moduleD = require('dependency/module/D');
    
    // ... other logic ...
    return module;
});
```

### Module IDs
The ID of a module typically has the form of `package/sub-package/name` where package / sub-package are optional and can have an arbitrary depth. The last segment will typically reflect the name of the script file. Modules referenced with this simple ID form are resolved against the configuration of the modularisation / AMD API configuration, specifically the configured packages. 

Currently, the following (sub-)packages are defined by default:

- *_base* - features / utilities considered core to the engine
- *_legacy* - features / utilities provided to wrap some Java component(s) that are bound to Rhino
- *alfresco* - base package for script API modules
- *alfrescoServices* - virtual package for access to Alfresco Java Foundation API services (all that are exposed via the [ServiceRegistry](http://dev.alfresco.com/resource/docs/java/org/alfresco/service/ServiceRegistry.html))
- *alfrescoWebScript* - virtual package for access to web scripts in the org/alfresco package

Additionally - for sake of memorisation / relative lookups - the following aliases are defined by default:

- *alfresco/foundation* as an alias to *alfrescoServices*
- *alfresco/webscript* as an alias to *alfrescoWebScript*

Any scripts outside of these configured packages and aliases cannot be loaded by using simple module IDs.  By specifying the module ID with a prefix to denote a module loader plugin, modules can be loaded from any script file as long as a loader exists to provide access to it. Such a composite module ID has the form of `loaderModuleId!package/sub-package/name` where *loaderModuleId* may be a simple module ID as outlined above.

Currently, the following loader modules are defined by default:

- *classpath* - loader to load scripts from anywhere on the classpath; the module ID effectively denotes the file-folder path
- *extensible-classpath* - special classpath loader to load scripts from anywhere on the classpath below the root *alfresco/* folder, with support for overrides located in *alfresco/extension/*
- *node* - loader to load scripts from content nodes within the Alfresco repository; supports a varied combination of NodeRef and path-based lookups
- *nashorn* - loader to load special utilities provided by the Nashorn engine, e.g. the *Packages* utility to access Java class hierarchies
- *spring* - loader to load any bean defined in Spring by its ID
- *serviceRegistry* - loader to load any Alfresco service exposed by the [ServiceRegistry](http://dev.alfresco.com/resource/docs/java/org/alfresco/service/ServiceRegistry.html)
- *webscript* - loader to load any script file within the Surf web script lookup path(s)
- *args* - loader to load objects provided via the script model
- *globalProperties* - loader to load single values or collections of values from the aggregated *alfresco-global.properties* set
- *legacyRootObjects* - loader to load modules / utilities which were provided as root scope objects in the Rhino script API
- *callerProvided* - special loader to load scripts that have been provided as inline strings (without any real file); primarily used for internal purposes 