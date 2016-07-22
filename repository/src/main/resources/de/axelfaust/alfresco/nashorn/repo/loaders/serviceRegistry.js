/* globals -require */
define('serviceRegistry', [ 'define', 'spring!ServiceRegistry' ], function alfresco_service_loader(define, serviceRegistry)
{
    'use strict';
    var loader;

    /**
     * This loader module provides the capability to load Alfresco public services from the service registry as AMD modules. In order to
     * ensure access to low-level Java services is not provided to any (potentially untrusted) script, services are always loaded as modules
     * that require a secure script to request it as a dependency.
     * 
     * @exports serviceRegistry
     * @author Axel Faust
     */
    loader = {
        /**
         * Loads an Alfresco publich service bean from a normalized module ID.
         * 
         * @instance
         * @param {string}
         *            normalizedId - the normalized ID of the module to load
         * @param {function}
         *            require - the context-sensitive require function
         * @param {function}
         *            load - the callback to load either a pre-built object as the module result or a script defining a module from a script
         *            URL
         */
        load : function alfresco_service_loader__load(normalizedId, require, load)
        {
            var service, serviceGetterSignature;

            // assume normalizedId is capital service, i.e. NodeService
            // JavaLinker has a minor bug not handling ConsString -> force String
            serviceGetterSignature = String('get' + normalizedId + '()');
            try
            {
                service = serviceRegistry[serviceGetterSignature]();
            }
            catch (e)
            {
                service = null;
            }

            if (service !== null)
            {
                load(define.asSpecialModule(service, [ 'secureUseOnly' ]), true);
            }
        }
    };

    Object.freeze(loader.load);
    Object.freeze(loader);

    return define.asSpecialModule(loader, [ 'secureUseOnly' ]);
});