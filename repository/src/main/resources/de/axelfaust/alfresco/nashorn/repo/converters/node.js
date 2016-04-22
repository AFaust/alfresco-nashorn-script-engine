/* globals -require */
define([ '_base/ConversionService', 'alfresco/node/ScriptNode' ], function commonConverters_root(ConversionService, ScriptNode)
{
    'use strict';
    ConversionService.registerJavaToScriptConverter('org.alfresco.service.cmr.repository.NodeRef',
            function commonConverters_convertNodeRefToScript(nodeRef)
            {
                var result;

                result = new ScriptNode(nodeRef);

                return result;
            });

    // in case somehow a ScriptNode has already been provided as a parameters
    ConversionService.registerJavaToScriptConverter('org.alfresco.repo.jscript.ScriptNode',
            function commonConverters_convertScriptNodeToScript(scriptNode)
            {
                var result;

                // luckily we can access ScriptNode.getNodeRef() without an active Rhino context
                result = new ScriptNode(scriptNode.nodeRef);

                return result;
            });

    // we don't export anything
    return null;
});