/* globals -require */
/* globals applicationContext: false */
(function spring_loader_root()
{
    'use strict';
    var appContext = applicationContext;

    define('spring', [ 'define' ], function spring_loader(define)
    {
        /**
         * This loader module provides the capability to load Spring beans from the global application context as AMD modules. In order to
         * ensure access to low-level Spring beans is not provided to any (potentially untrusted) script, Spring beans are always loaded as
         * modules that require a secure script to request it as a dependency.
         * 
         * @exports spring
         * @author Axel Faust
         */
        var loader = {
            /**
             * Loads a Spring bean from a normalized module ID.
             * 
             * @instance
             * @param {string}
             *            normalizedId - the normalized ID of the module to load
             * @param {function}
             *            require - the context-sensitive require function
             * @param {function}
             *            load - the callback to load either a pre-built object as the module result or a script defining a module from a
             *            script URL
             */
            load : function spring_loader__load(normalizedId, require, load)
            {
                var bean = appContext.getBean(normalizedId.replace(/\//g, '.'));
                load(define.asSpecialModule(bean, [ 'secureUseOnly' ]), true);
            }
        };

        Object.freeze(loader.load);
        Object.freeze(loader);

        return define.asSpecialModule(loader, [ 'secureUseOnly' ]);
    });
}());
