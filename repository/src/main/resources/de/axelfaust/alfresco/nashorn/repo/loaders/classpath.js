/* globals -require */
/* globals SimpleLogger: false */
(function classpath_loader_root()
{
    'use strict';
    // non-extensible raw classpath loader (scripts located anywhere in classpath)
    define('classpath', [ 'nashorn!Java' ],
            function classpath_loader(Java)
            {
                var URL, AlfrescoClasspathURLStreamHandler, streamHandler, logger, loader;

                logger = new SimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.classpath');
                URL = Java.type('java.net.URL');
                // need to select specific constructor to override basePath
                AlfrescoClasspathURLStreamHandler = Java
                        .type('de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLStreamHandler')['(java.lang.String)'];
                streamHandler = new AlfrescoClasspathURLStreamHandler(null);

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
                     *            load - the callback to load either a pre-built object as the module result or a script defining a module
                     *            from a script URL
                     */
                    load : function classpath_loader__load(normalizedId, require, load)
                    {
                        var url = new URL('classpath', null, -1, normalizedId, streamHandler);

                        logger.trace('Loading module id {} from classpath', normalizedId);

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
        var URL, AlfrescoClasspathURLStreamHandler, streamHandler, logger, loader;

        logger = new SimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.extensible-classpath');
        URL = Java.type('java.net.URL');
        AlfrescoClasspathURLStreamHandler = Java.type('de.axelfaust.alfresco.nashorn.repo.loaders.AlfrescoClasspathURLStreamHandler');
        streamHandler = new AlfrescoClasspathURLStreamHandler(true);

        /**
         * This loader module provides the capability to load "extensible classpath"-stored scripts as AMD modules in such a way that
         * scripts in the shared/classes/alfresco/extension/ override scripts on the classpath without any path prefixes.
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
                var url = new URL('extensible-classpath', null, -1, normalizedId, streamHandler);

                logger.trace('Loading module id {} from extensible classpath', normalizedId);

                load(url, true);
            }
        };

        Object.freeze(loader.load);
        Object.freeze(loader);

        return loader;
    });
}());