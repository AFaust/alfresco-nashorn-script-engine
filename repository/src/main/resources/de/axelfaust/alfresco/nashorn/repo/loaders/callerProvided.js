/* globals -require */
define('callerProvided', [ 'nashorn!Java' ], function callerProvided_loader(Java)
{
    'use strict';
    var URL, CallerProvidedURLConnection, CallerProvidedURLStreamHandler, streamHandler, logger, loader;

    logger = Java.type('org.slf4j.LoggerFactory').getLogger(
            'de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.callerProvided');
    URL = Java.type('java.net.URL');
    CallerProvidedURLConnection = Java.type('de.axelfaust.alfresco.nashorn.repo.loaders.CallerProvidedURLConnection');
    CallerProvidedURLStreamHandler = Java.type('de.axelfaust.alfresco.nashorn.repo.loaders.CallerProvidedURLStreamHandler');
    streamHandler = new CallerProvidedURLStreamHandler();

    /**
     * This loader module provides the capability to load dynamic inline scripts passed to the script processor as AMD modules. file(s).
     * 
     * @exports callerProvided
     * @author Axel Faust
     */
    loader = {
        /**
         * Loads a caller provided script - the module ID is actually irrelevant in this case as at most one dynamic inline script passed to
         * the script processor can exist in the current execution context.
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
        load : function callerProvided_loader__load(normalizedId, require, load)
        {
            var url = new URL('callerProvided', null, -1, normalizedId, streamHandler);

            logger.trace('Loading module id {} from caller provided script', normalizedId);

            load(url, CallerProvidedURLConnection.isCallerProvidedScriptSecure());
        }
    };

    Object.freeze(loader.load);
    Object.freeze(loader);

    return loader;
});