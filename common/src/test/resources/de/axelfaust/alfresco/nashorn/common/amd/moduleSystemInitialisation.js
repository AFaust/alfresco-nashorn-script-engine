'use strict';
(function initModuleSystem()
{
    var ClassPathScriptURLResolverCls, ModuleSystemCls, scriptUrlResolver, moduleSystem, globalScope;
    
    ClassPathScriptURLResolverCls = Java.type('de.axelfaust.alfresco.nashorn.common.amd.core.ClassPathScriptURLResolver');
    ModuleSystemCls = Java.type('de.axelfaust.alfresco.nashorn.common.amd.core.ModuleSystem');

    globalScope = this;
    scriptUrlResolver = new ClassPathScriptURLResolverCls();
    scriptUrlResolver.addSupportedFileSuffix('js');
    scriptUrlResolver.addSupportedFileSuffix('nashornjs');
    moduleSystem = new ModuleSystemCls(scriptUrlResolver, Object, function scopeBuilder(contextRequire, contextDefine)
    {
        // a new scope protects the global scope from any new defined globals and allows us to ensure existence of require/define
        var newScope = Object.create(globalScope, {
            define : {
                value : contextDefine
            },
            require : {
                value : contextRequire
            }
        });
        return newScope;
    }, load);
    
    this.require = moduleSystem.requireFunction;
    this.define = moduleSystem.defineFunction;
}.call(this));
