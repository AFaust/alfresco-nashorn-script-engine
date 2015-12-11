// scopeObj is defined by complete-processor-init.js
'use strict';
scopeObj = (function scope_prepare()
{
    var defineOverrideAsUndefined, defineOverrideAsSecureOnly, scopeObj, globalScope = this;

    defineOverrideAsUndefined = function scope_prepare__defineOverrideAsUndefined(obj, field)
    {
        Object.defineProperty(obj, field, {
            value : undefined
        });
    };

    defineOverrideAsSecureOnly = function scope_prepare__defineOverrideAsSecureOnly(obj, field)
    {
        var fieldName = field;

        Object.defineProperty(obj, field, {
            configurable : false,
            enumerable : false,
            get : function scope_prepare__defineOverrideAsSecureOnly_get()
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
    defineOverrideAsSecureOnly(scopeObj, 'Java');
    defineOverrideAsSecureOnly(scopeObj, 'JavaImporter');

    // don't expose packages except via Packages, Java or JavaImporter
    defineOverrideAsUndefined(scopeObj, 'com');
    defineOverrideAsUndefined(scopeObj, 'edu');
    defineOverrideAsUndefined(scopeObj, 'java');
    defineOverrideAsUndefined(scopeObj, 'javax');
    defineOverrideAsUndefined(scopeObj, 'javafx');
    defineOverrideAsUndefined(scopeObj, 'org');

    // TODO dynamic shortcuts (legacy support) to processor extensions / root objects

    return scopeObj;
}());