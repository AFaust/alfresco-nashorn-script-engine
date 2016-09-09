define([ '_base/logger', 'nashorn!Java' ], function(logger, Java)
{
    'use strict';
    var IllegalArgumentException, module;

    IllegalArgumentException = Java.type('java.lang.IllegalArgumentException');

    /**
     * This module provides utility functions for conversion of node-like object or (stringifed) NodeRef values into script representations.
     * 
     * @module alfresco/node/nodeConversionUtils
     * @requires module:_base/logger
     * @requires module:nashorn!Java
     * @author Axel Faust
     */
    module = {
        /**
         * Converts a node-like object or straight (stringified) NodeRef value into a script representation of a node.
         * 
         * @instance
         * @memberOf module:alfresco/node/nodeConversionUtils
         * @param {object}
         *            node - the node-like object / (stringified) NodeRef to convert
         * @param {string}
         *            [nodeModuleId] - the name of the script module to use for representing the node (defaults to
         *            [alfresco/node/Node]{@link module:alfresco/node/Node})
         * @returns {object} the script representation of the node
         */
        convertNode : function alfresco_node_nodeConversionUtils__convertNode(node, nodeModuleId)
        {
            var result;

            require([ nodeModuleId || 'alfresco/node/Node' ],
                    function alfresco_node_nodeConversionUtils__convertNode_requireCallback(NodeModule)
                    {
                        var ref = node.nodeRef || node;
                        if (typeof NodeModule.valueOf === 'function' && NodeModule.valueOf !== Object.prototype.valueOf)
                        {
                            logger.trace('Node module {} provides a valueOf', nodeModuleId);
                            result = NodeModule.valueOf(ref);
                        }
                        else if (typeof NodeModule === 'function')
                        {
                            logger.trace('Node module {} assumed to be instantiable', nodeModuleId);
                            result = new NodeModule(ref);
                        }
                        else
                        {
                            throw new IllegalArgumentException('Unsupported node module: ' + nodeModuleId);
                        }
                    });

            return result;
        },

        /**
         * Converts a list of node-like objects or straight (stringified) NodeRef values into the script representations of nodes.
         * 
         * @instance
         * @memberOf module:alfresco/node/nodeConversionUtils
         * @param {object}
         *            nodes - the node-like objects / (stringified) NodeRefs to convert
         * @param {string}
         *            [nodeModuleId] - the name of the script module to use for representing the nodes (defaults to
         *            [alfresco/node/Node]{@link module:alfresco/node/Node})
         * @returns {array} the array of script representations of the nodes
         */
        convertNodes : function alfresco_node_nodeConversionUtils__convertNodes(nodes, nodeModuleId)
        {
            var result = [];

            require([ nodeModuleId || 'alfresco/node/Node' ],
                    function alfresco_node_nodeConversionUtils__convertNodes_requireCallback(NodeModule)
                    {
                        if (typeof NodeModule.valueOf === 'function' && NodeModule.valueOf !== Object.prototype.valueOf)
                        {
                            logger.trace('Node module {} provides a valueOf', nodeModuleId);
                        }
                        else if (typeof NodeModule === 'function')
                        {
                            logger.trace('Node module {} assumed to be instantiable', nodeModuleId);
                        }
                        else
                        {
                            throw new IllegalArgumentException('Unsupported node module: ' + nodeModuleId);
                        }

                        nodes.forEach(function alfresco_node_nodeConversionUtils__convertNodes_requireCallback_forEachNodeRef(node)
                        {
                            var ref, resultNode;
                            ref = node.nodeRef || node;
                            if (typeof NodeModule.valueOf === 'function' && NodeModule.valueOf !== Object.prototype.valueOf)
                            {
                                resultNode = NodeModule.valueOf(ref);
                            }
                            else if (typeof NodeModule === 'function')
                            {
                                logger.trace('Node module {} assumed to be instantiable', nodeModuleId);
                                resultNode = new NodeModule(ref);
                            }
                            result.push(resultNode);
                        });
                    });

            return result;
        }
    };
    Object.freeze(module);

    return module;
});