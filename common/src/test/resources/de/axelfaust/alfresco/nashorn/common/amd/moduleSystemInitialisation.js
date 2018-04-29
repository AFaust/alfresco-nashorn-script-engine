'use strict';
(function initModuleSystem()
{
    var ClassPathScriptURLResolverCls, ModuleSystemCls, scriptUrlResolver, moduleSystem, globalScope;
    
    ClassPathScriptURLResolverCls = Java.type('de.axelfaust.alfresco.nashorn.common.amd.ClassPathScriptURLResolver');
    ModuleSystemCls = Java.type('de.axelfaust.alfresco.nashorn.common.amd.ModuleSystem');

    globalScope = this;
    scriptUrlResolver = new ClassPathScriptURLResolverCls();
    scriptUrlResolver.addSupportedFileSuffix('js');
    scriptUrlResolver.addSupportedFileSuffix('nashornjs');
    moduleSystem = new ModuleSystemCls(scriptUrlResolver, Object, function scopeBuilder()
    {
        // we simply use the require function of the module system to get context-aware instances of define/require for the script about to
        // be loaded in this new scope
        // a new scope protects the global scope from any new defined globals and allows us to ensure existence of require/define in case
        // they are not available as globals
        var newScope = Object.create(globalScope, {
            define : {
                value : moduleSystem.requireFunction('define')
            },
            require : {
                value : moduleSystem.requireFunction('require')
            }
        });
        return newScope;
    }, load);
    
    this.require = moduleSystem.requireFunction;
    this.define = moduleSystem.defineFunction;
}.call(this));
