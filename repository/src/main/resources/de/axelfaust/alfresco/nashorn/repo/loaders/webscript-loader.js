'use strict';
define(
        'webscript',
        [ 'define', 'spring!webscripts.searchpath', 'spring!contentService', 'spring!retryingTransactionHelper' ],
        function webscript_loader(define, searchPath, contentService, retryingTransactionHelper)
        {
            var scriptLoader, apiStores, logger, idx, max, storeLoader, storeLoaders = [], suffixes = [ '', '.nashornjs', '.js' ], loader, URL, WebScriptURLStreamHandler;

            URL = Java.type('java.net.URL');
            WebScriptURLStreamHandler = Java.type('de.axelfaust.alfresco.nashorn.repo.loaders.WebScriptURLStreamHandler');

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

            scriptLoader = new org.springframework.extensions.webscripts.MultiScriptLoader(Java.to(storeLoaders,
                    'org.springframework.extensions.webscripts.ScriptLoader[]'));

            loader = {
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
                        logger.trace('Script stores contains a script {} for module id {}', script, normalizedId);
                        url = new URL('webscript', null, -1, normalizedId, new WebScriptURLStreamHandler(script, contentService,
                                retryingTransactionHelper));
                        load(url, script.isSecure());
                    }
                    else
                    {
                        logger.trace('Script stores do not contain a script for module id {}', normalizedId);
                        load(null, false);
                    }
                }
            };

            Object.freeze(loader.load);
            Object.freeze(loader);

            return loader;
        });