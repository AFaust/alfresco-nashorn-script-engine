/* globals -require */
/* globals SimpleLogger: false */
/* globals applicationContext: false */
(function callerProvided_loader_root()
{
    'use strict';
    // applicationContext only set during engine setup
    var streamHandler = applicationContext ? applicationContext
            .getBean('de.axelfaust.alfresco.nashorn.repo-callerProvidedURLStreamHandler') : null;

    define('callerProvided', [ 'nashorn!Java' ], function callerProvided_loader(Java)
    {
        var URL, CallerProvidedURLStreamHandler, logger, loader;

        logger = new SimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.callerProvided');
        URL = Java.type('java.net.URL');
        CallerProvidedURLStreamHandler = Java.type('de.axelfaust.alfresco.nashorn.repo.loaders.CallerProvidedURLStreamHandler');

        if (streamHandler === null)
        {
            streamHandler = new CallerProvidedURLStreamHandler();
        }

        /**
         * This loader module provides the capability to load dynamic inline scripts passed to the script processor as AMD modules. file(s).
         * 
         * @exports callerProvided
         * @author Axel Faust
         */
        loader = {
            /**
             * Loads a caller provided script - the module ID is actually irrelevant in this case as at most one dynamic inline script
             * passed to the script processor can exist in the current execution context.
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
            load : function callerProvided_loader__load(normalizedId, require, load)
            {
                var url = new URL('callerProvided', null, -1, normalizedId, streamHandler);

                logger.trace('Loading module id {} from caller provided script', normalizedId);

                load(url, CallerProvidedURLStreamHandler.isCallerProvidedScriptSecure());
            }
        };

        Object.freeze(loader.load);
        Object.freeze(loader);

        return loader;
    });
}());