'use strict';
define('webscript', [ 'define', 'spring!webscripts.searchpath', 'spring!contentService', 'spring!retryingTransactionHelper' ],
        function webscript_loader(define, searchPath, contentService, retryingTransactionHelper)
        {
            var scriptLoader, apiStores, idx, max, storeLoader, storeLoaders = [];

            apiStores = searchPath.stores;

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

            return {
                load : function webscript_loader__load(normalizedId, require, load)
                {
                    var script = scriptLoader.getScript(normalizedId), url;

                    if (script !== null)
                    {
                        url = new Packages.java.net.URL('webscript', null, -1, normalizedId,
                                new Packages.de.axelfaust.alfresco.nashorn.repo.loaders.WebScriptURLStreamHandler(script, contentService,
                                        retryingTransactionHelper));
                        load(url, script.isSecure());
                    }
                    else
                    {
                        load(null, false);
                    }
                }
            };
        });