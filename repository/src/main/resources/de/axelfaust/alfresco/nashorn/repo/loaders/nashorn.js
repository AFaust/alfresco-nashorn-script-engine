/* globals -require */
/* globals Java: false */
/* globals JavaImporter: false */
/* globals JSAdapter: false */
/* globals Packages: false */
/* globals SimpleLogger: false */
(function nashorn_loader_root()
{
    'use strict';
    // this loader will be responsible for providing access to Nashorn global utilities that we may want to restrict to secure scripts
    // in order to prevent circumventions those global utilities will be removed after this loader is defined, so we need to store them
    // locally in a "backup" object
    var globalBackup, logger;

    globalBackup = {
        /**
         * This module provides resolution of Java types (classes) via the Packages Nashorn extension that is identical in behaviour to the
         * Rhino Packages root object. The Nashorn context may have been constructed with a defined ClassFilter that can restrict the set of
         * classes that may be resolved from within a script.
         * 
         * @module nashorn!Packages
         * @example var Packages = require('nashorn!Packages'); var out = Packages.java.lang.System.out; out.println('Test');
         */
        Packages : Packages,
        /**
         * This module provides Java type resolution, type checking and conversion functionality. In type resolution use cases it should
         * typically be preferred to {@link module:nashorn!Packages}.
         * 
         * @module nashorn!Java
         * @example var Java = require('nashorn!Java'); var System = Java.type('java.lang.System'); System.out.println('Test');
         * @example var Java = require('nashorn!Java'); var strArr = ['str1', 'str2', 'str3']; var javaList = Java.to(strArr,
         *          'java.util.List'); var javaStrArr = Java.to(strArr, 'java.lang.String[]'); strArr = Java.from(javaStrArr);
         * @example var Java = require('nashorn!Java'); var JsThread1 = Java.extend(Java.type('java.lang.Thread')); var thread = new
         *          JsThread1(){run : function () {print('js thread 1 run');}}; var JsThread2 = Java.extend(Java.type('java.lang.Thread'),
         *          {run : function () {print('js thread 2 run');}});
         */
        Java : Java,
        /**
         * This modules provides the ability to bulk import classes from defined packages into a with-scope block. It should be noted that
         * with-scope blocks are not supported in strict-mode scripts, which most (if not all) modules will be loaded as by default.
         * 
         * @module nashorn!JavaImporter
         * @example var Packages = require('nashorn!Packages'); var JavaImporter = require('nashorn!JavaImporter'); var imports = new
         *          JavaImporter(Packages.java.util, Packages.java.io); with (imports) { var m = new HashMap(); var f = new File('.'); }
         */
        JavaImporter : JavaImporter,
        /**
         * This modules provides the ability to construct adapters / proxies for JavaScript objects.
         * 
         * @module nashorn!JSAdapter
         * @example var JSAdapter = require('nashorn!JSAdapter'); var obj = { prop1 : 'test'}; var proxy = new JSAdapter({__get__ :
         *          function(name} { if(name === 'prop1') return obj.prop1; });
         */
        JSAdapter : JSAdapter
    };

    logger = new SimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.nashorn');

    define('nashorn', [ 'define' ], function nashorn_loader(define)
    {
        var loader;

        /**
         * This loader module provides the capability to load selected Nashorn built-ins for Java-interoperability as AMD modules. As
         * advanced functionality that can break script isolation, Nashorn modules are only available to secure script modules.
         * 
         * @exports nashorn
         * @author Axel Faust
         */
        loader = {
            /**
             * Loads a Nashorn built-in from a normalized module ID.
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
            load : function nashorn_loader__load(normalizedId, require, load)
            {
                var module;

                if (globalBackup.hasOwnProperty(normalizedId))
                {
                    logger.debug('Loading {} as secureUseOnly module', normalizedId);
                    module = globalBackup[normalizedId];
                    load(define.asSpecialModule(module, [ 'secureUseOnly' ]), true);
                }
                else
                {
                    logger.debug('Module {} not provided by this loader', normalizedId);
                }
            }
        };

        Object.freeze(loader.load);
        Object.freeze(loader);

        return define.asSpecialModule(loader, [ 'secureUseOnly' ]);
    });
}());