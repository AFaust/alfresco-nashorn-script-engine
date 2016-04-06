/* globals -require */
define(
        'webscript',
        [ 'spring!webscripts.searchpath', 'spring!nodeService', 'spring!contentService', 'spring!retryingTransactionHelper', 'nashorn!Java' ],
        function webscript_loader(searchPath, nodeService, contentService, retryingTransactionHelper, Java)
        {
            'use strict';
            var scriptLoader, apiStores, logger, idx, max, storeLoader, storeLoaders = [], suffixes = [ '', '.nashornjs', '.js' ], loader, URL, WebScriptURLStreamHandler, MultiScriptLoader;

            URL = Java.type('java.net.URL');
            WebScriptURLStreamHandler = Java.type('de.axelfaust.alfresco.nashorn.repo.loaders.WebScriptURLStreamHandler');
            MultiScriptLoader = Java.type('org.springframework.extensions.webscripts.MultiScriptLoader');

            apiStores = searchPath.stores;
            logger = Java.type('org.slf4j.LoggerFactory').getLogger(
                    'de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.webscript');

            for (idx = 0, max = apiStores.length; idx < max; idx++)
            {
                storeLoader = apiStores[idx].scriptLoader;
                if (storeLoader === null)
                {
                    throw new Error('Unable to retrieve script loader for Web Script store ' + apiStores[idx].basePath);
                }
                storeLoaders.push(storeLoader);
            }

            scriptLoader = new MultiScriptLoader(Java.to(storeLoaders, 'org.springframework.extensions.webscripts.ScriptLoader[]'));

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
                 *            load - the callback to load either a pre-built object as the module result or a script defining a module from
                 *            a script URL
                 */
                load : function webscript_loader__load(normalizedId, require, load)
                {
                    var script = null, url;

                    suffixes.forEach(function webscript_loader__load_forEachSuffix(suffix)
                    {
                        if (script === null)
                        {
                            script = scriptLoader.getScript(normalizedId + suffix);
                        }
                    });

                    if (script !== null)
                    {
                        logger.trace('Script stores contains a script {} for module id {}', [ script, normalizedId ]);
                        url = new URL('webscript', null, -1, normalizedId, new WebScriptURLStreamHandler(script, nodeService,
                                contentService, retryingTransactionHelper));
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