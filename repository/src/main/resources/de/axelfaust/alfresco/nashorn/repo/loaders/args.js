/* globals -require */
/* globals SimpleLogger: false */
define('args', [ 'nashorn!Java', '_base/ConversionService' ], function args_loader(Java, ConversionService)
{
    'use strict';

    var loader, logger, NashornScriptModel, executionState;

    logger = new SimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.args');

    NashornScriptModel = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModel');
    executionState = NashornScriptModel.newAssociativeContainer();

    /**
     * This loader module provides the capability to load entries from the script argument model as AMD modules.
     * 
     * @exports args
     * @author Axel Faust
     */
    loader = {
        /**
         * Loads a script model argument from a normalized module ID.
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
        load : function args_loader__load(normalizedId, require, load)
        {
            var result;

            logger.trace('Trying to load {} from script argument model', normalizedId);

            result = (executionState.argumentModel || {})[normalizedId];

            logger.trace('Resolved {} from script argument model', result);

            // convert potential Java object into script representation e.g. NodeRef into an instanceof of a ScriptNode-like module
            result = ConversionService.convertToScript(result);
            
            logger.debug('Resolved {} from script argument model (including conversion)', result);

            // arguments are never considered secure
            load(result, false);
        },

        setArgumentModel : function args_loader__setArgumentModel(argumentModel)
        {
            executionState.argumentModel = argumentModel;
        }
    };

    Object.freeze(loader.load);
    Object.freeze(loader.setArgumentModel);
    Object.freeze(loader);

    return loader;
});