/* globals -define */
require([ '_base/ConversionService', 'alfresco/node/Node', '_base/logger' ], function nodeConverters_root(ConversionService,
        ScriptNode, logger)
{
    'use strict';
    ConversionService.registerJavaToScriptConverter('org.alfresco.service.cmr.repository.NodeRef',
            function nodeConverters_convertNodeRefToScript(nodeRef)
            {
                var result;

                logger.trace('Converting NodeRef {} to alfresco/node/Node', nodeRef);

                result = new ScriptNode(nodeRef);

                return result;
            });

    // in case somehow a ScriptNode has already been provided as a parameters
    ConversionService.registerJavaToScriptConverter('org.alfresco.repo.jscript.ScriptNode',
            function nodeConverters_convertScriptNodeToScript(scriptNode)
            {
                var result;

                logger.trace('Converting ScriptNode {} to alfresco/node/Node', scriptNode.nodeRef);

                // luckily we can access ScriptNode.getNodeRef() without an active Rhino context
                result = new ScriptNode(scriptNode.nodeRef);

                return result;
            });
});