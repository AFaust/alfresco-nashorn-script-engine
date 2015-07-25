// scopeObj is defined by complete-processor-init.js
scopeObj = (function prepareScope()
{
    var defineOverrideAsUndefined, defineOverrideAsSecureOnly, scopeObj, globalScope = this;

    defineOverrideAsUndefined = function(obj, field)
    {
        Object.defineProperty(obj, field, {
            value : undefined
        });
    };

    defineOverrideAsSecureOnly = function(obj, field)
    {
        var fieldName = field;

        Object.defineProperty(obj, field, {
            configurable : false,
            enumerable : false,
            get : function()
            {
                var result;
                if (require.isSecureCallerScript())
                {
                    result = globalScope[fieldName];
                }
                
                return result;
            }
        })
    };

    scopeObj = {};

    // don't allow any custom scripts to be loaded except with provided utilities
    defineOverrideAsUndefined(scopeObj, 'load');
    defineOverrideAsUndefined(scopeObj, 'loadWithNewGlobal');

    // definitely don't allow exit
    defineOverrideAsUndefined(scopeObj, 'exit');
    defineOverrideAsUndefined(scopeObj, 'quit');
    
    // don't allow access to console output except via proper logging facilities
    defineOverrideAsUndefined(scopeObj, 'print');

    // allow access to special Java integration elements only for secure scripts
    defineOverrideAsSecureOnly(scopeObj, 'Packages');
    defineOverrideAsSecureOnly(scopeObj, 'com');
    defineOverrideAsSecureOnly(scopeObj, 'edu');
    defineOverrideAsSecureOnly(scopeObj, 'java');
    defineOverrideAsSecureOnly(scopeObj, 'javax');
    defineOverrideAsSecureOnly(scopeObj, 'javafx');
    defineOverrideAsSecureOnly(scopeObj, 'org');
    
    defineOverrideAsSecureOnly(scopeObj, 'Java');
    defineOverrideAsSecureOnly(scopeObj, 'JavaImporter');
    
    // TODO dynamic shortcuts (legacy support) to processor extensions / root objects

    return scopeObj;
}());