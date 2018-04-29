'use strict';

(function()
{
    var globalRequire = require;
    define('moduleViaCommonJS', function(require, exports, module)
    {
        if (typeof require !== 'function')
        {
            throw new Error('Default dependency "require" should be a function');
        }

        if (require === globalRequire)
        {
            throw new Error('Default dependency "require" should be different from the global "require" module');
        }

        if (exports === undefined || exports === null || typeof exports !== 'object'
                || Object.prototype.toString.call(exports) !== '[object Object]')
        {
            throw new Error('Default dependency "exports" should be a script object');
        }

        if (Object.getOwnPropertyNames(exports).length !== 0)
        {
            throw new Error('Default dependency "exports" should be an empty script objectr');
        }

        if (module === undefined || module === null || typeof module !== 'object'
                || Object.prototype.toString.call(module) !== '[object Object]')
        {
            throw new Error('Default dependency "module" should be a script object');
        }

        if (module.id !== 'moduleViaCommonJS')
        {
            throw new Error('Value of "module.id" does not match module ID');
        }

        if (module.url === undefined || module.url === null
                || !/de\/axelfaust\/alfresco\/nashorn\/common\/amd\/factoryDefine.js$/.test(module.url))
        {
            throw new Error('Value of "module.url" does not match script URL');
        }

        if (module.exports !== exports)
        {
            throw new Error('Value of "module.exports" does not match "exports"');
        }

        exports.value = 'moduleViaCommonJS-value';
    });
}());

define('moduleWithNoDependencies', [], function()
{
    return 'moduleWithNoDependencies-value';
});
