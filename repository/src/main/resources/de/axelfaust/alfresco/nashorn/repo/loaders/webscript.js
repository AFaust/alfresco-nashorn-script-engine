/* globals -require */
/* globals SimpleLogger: false */
define('webscript', [ 'spring!de.axelfaust.alfresco.nashorn.repo-webscriptURLStreamHandler', 'nashorn!Java' ], function webscript_loader(
        webscriptURLStreamHandler, Java)
{
    'use strict';
    var logger, loader, URL;

    URL = Java.type('java.net.URL');
    logger = new SimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.webscript');

    /**
     * This loader module provides the capability to load web scripts as AMD modules, using the Surf web script loader as the lookup
     * backend.
     * 
     * @exports webscript
     * @author Axel Faust
     */
    loader = {
        /**
         * Loads a script located within the web script lookup paths from a normalized module ID.
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
        load : function webscript_loader__load(normalizedId, require, load)
        {
            var script = null, url;

            // avoid repeated script resolution when already provided (especially since resolution may query DB)
            require([ 'args!_RepositoryNashornScriptProcessor_RepositoryScriptLocation' ], function webscript_loader__load_callback(scriptLocation)
            {
                if (scriptLocation.scriptModuleId === normalizedId)
                {
                    logger.trace('Currently part of web script execution and requested module ID matches pre-resolved web script');
                    script = scriptLocation.content;
                }
            }, function webscript_loader__load_errCallback()
            {
                logger.trace('Currently not part of "real" web script execution');
            });

            if (script === null)
            {
                script = webscriptURLStreamHandler.resolveScriptContent(normalizedId);
            }

            if (script !== null)
            {
                logger.trace('Script stores contains a script {} for module id {}', [ script, normalizedId ]);
                url = new URL('webscript', null, -1, normalizedId, webscriptURLStreamHandler);
                webscriptURLStreamHandler.bindScriptContent(url, script);
                load(url, script.isSecure());
            }
            else
            {
                logger.trace('Script stores do not contain a script for module id {}', normalizedId);
            }
        }
    };

    Object.freeze(loader.load);
    Object.freeze(loader);

    return loader;
});