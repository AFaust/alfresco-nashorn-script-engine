/* globals -require */
/* globals getSimpleLogger: false */
/* globals applicationContext: false */
(function classpath_loader_root()
{
    'use strict';
    // applicationContext only set during engine setup
    var streamHandler = applicationContext ? applicationContext.getBean('de.axelfaust.alfresco.nashorn.repo-classpathURLStreamHandler')
            : null;

    // non-extensible raw classpath loader (scripts located anywhere in classpath)
    define('classpath', [ 'nashorn!Java' ], function classpath_loader(Java)
    {
        var URL, logger, loader;

        logger = getSimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.classpath');
        URL = Java.type('java.net.URL');
        if (streamHandler === null)
        {
            streamHandler = (function()
            {
                var AlfrescoClasspathURLStreamHandler;

                AlfrescoClasspathURLStreamHandler = Java
                        .type('de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLStreamHandler');
                streamHandler = new AlfrescoClasspathURLStreamHandler();
                streamHandler.basePath = 'alfresco';
                streamHandler.extensionPath = 'extension';

                return streamHandler;
            }());
        }

        /**
         * This loader module provides the capability to load classpath-stored scripts as AMD modules.
         * 
         * @exports classpath
         * @author Axel Faust
         */
        loader = {
            /**
             * Loads a script stored on the classpath from normalized module ID.
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
            load : function classpath_loader__load(normalizedId, require, load)
            {
                var url = new URL('rawclasspath', null, -1, normalizedId, streamHandler);

                if (logger.traceEnabled)
                {
                    logger.trace('Loading module id {} from classpath', normalizedId);
                }

                load(url, true);
            }
        };

        Object.freeze(loader.load);
        Object.freeze(loader);

        return loader;
    });

    // extensible alfresco classpath loader (scripts located in /alfresco/extension/ or /alfresco/)
    define('extensible-classpath', [ 'nashorn!Java' ], function extensible_classpath_loader__load(Java)
    {
        var URL, logger, loader;

        logger = getSimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.extensible-classpath');
        URL = Java.type('java.net.URL');
        if (streamHandler === null)
        {
            streamHandler = (function()
            {
                var AlfrescoClasspathURLStreamHandler;

                AlfrescoClasspathURLStreamHandler = Java
                        .type('de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLStreamHandler');
                streamHandler = new AlfrescoClasspathURLStreamHandler();
                streamHandler.basePath = 'alfresco';
                streamHandler.extensionPath = 'extension';

                return streamHandler;
            }());
        }

        /**
         * This loader module provides the capability to load "extensible classpath"-stored scripts as AMD modules in such a way that
         * scripts in the /alfresco/extension/ override scripts in /alfresco/.
         * 
         * @exports extensible-classpath
         * @author Axel Faust
         */
        loader = {
            /**
             * Loads a script stored on the "extensible classpath" from normalized module ID.
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
            load : function extensible_classpath_loader__load(normalizedId, require, load)
            {
                var url = new URL('extclasspath', null, -1, normalizedId, streamHandler);

                if (logger.traceEnabled)
                {
                    logger.trace('Loading module id {} from extensible classpath', normalizedId);
                }

                load(url, true);
            }
        };

        Object.freeze(loader.load);
        Object.freeze(loader);

        return loader;
    });
}());