/* globals -require */
/**
 * This module provides the equivalent of the Rhino-ScriptNode API internal properties map for a particular node. Other than the Rhino-based
 * properties map, this module will not pre-emptively convert all node properties into their script representation and will not attempt to
 * save/store any properties that have not been accessed, avoiding accidental overrides of properties set via policies.
 * 
 * @module alfresco/node/NodePropertiesMap
 * @mixes module:_base/ProxySupport
 * @requires module:_base/declare
 * @requires module:alfresco/common/QName
 * @requires module:_base/ConversionService
 * @requires module:alfresco/foundation/DictionaryService
 * @requires module:alfresco/foundation/NodeService
 * @requires module:alfresco/foundation/FileFolderService
 * @requires module:_base/logger
 * @requires module:nashorn!Java
 */
define([ '_base/declare', '_base/ProxySupport', '../common/QName', '_base/ConversionService', '../foundation/DictionaryService',
        '../foundation/NodeService', '../foundation/FileFolderService', '_base/logger', 'nashorn!Java' ],
        function alfresco_node_NodePropertiesMap_root(declare, ProxySupport, QName, ConversionService, DictionaryService, NodeService,
                FileFolderService, logger, Java)
        {
            'use strict';
            var NodeRef, ContentModel, List, HashMap, IllegalArgumentException;

            NodeRef = Java.type('org.alfresco.service.cmr.repository.NodeRef');
            ContentModel = Java.type('org.alfresco.model.ContentModel');
            List = Java.type('java.util.List');
            HashMap = Java.type('java.util.HashMap');
            IllegalArgumentException = Java.type('java.lang.IllegalArgumentException');

            return declare([ ProxySupport ], {

                '--proxy-support-enabled' : true,

                '--proxy-no-such-property-fallback-to-__get__' : true,

                '--proxy-virtual-getters-enabled' : true,

                '--proxy-virtual-getter-fallback-to-__get__' : true,

                '--proxy-virtual-setters-enabled' : true,

                '--proxy-virtual-setter-fallback-to-__put__' : true,

                classConstructor : function alfresco_node_NodePropertiesMap__classConstructor(nodeRef)
                {
                    var internalNodeRef;

                    if (typeof nodeRef === 'string')
                    {
                        internalNodeRef = new NodeRef(nodeRef);
                    }
                    else if (nodeRef instanceof NodeRef)
                    {
                        internalNodeRef = nodeRef;
                    }
                    else if (nodeRef !== undefined && nodeRef !== null)
                    {
                        internalNodeRef = new NodeRef(String(nodeRef));
                    }

                    if (internalNodeRef === null)
                    {
                        throw new IllegalArgumentException('nodeRef value invalid: ' + nodeRef);
                    }

                    // setup internal state

                    Object.defineProperties(this, {
                        // identity of backing node
                        nodeRef : {
                            value : internalNodeRef
                        },
                        // map of properties as exposed to scripts (set/retrieved at least once and converted)
                        effectiveScriptProperties : {
                            value : {}
                        },
                        explicitlyAccessedProperties : {
                            value : []
                        },
                        // map of Alfresco properties as previously retrieved (for checking against potential co-modification in other
                        // APIs)
                        nodeProperties : {
                            value : {}
                        }
                    });
                    this._loadNodeProperties();
                },

                /**
                 * (Re-)Loads the current properties of the node via the underlying NodeService.
                 * 
                 * @instance
                 * @private
                 * @function
                 */
                _loadNodeProperties : function alfresco_node_NodeProperties__loadNodeProperties()
                {
                    var nodeProperties, qnameKey, qname;

                    logger.debug('Loading actual node properties for {}', this.nodeRef);
                    // clear old state
                    for (qname in this.nodeProperties)
                    {
                        if (this.nodeProperties.hasOwnProperty(qname))
                        {
                            delete this.nodeProperties[qname];
                        }
                    }

                    // clear cached properties unless they have been explicitly accessed
                    for (qname in this.effectiveScriptProperties)
                    {
                        if (this.effectiveScriptProperties.hasOwnProperty(qname)
                                && this.explicitlyAccessedProperties.indexOf(qname.prefixString) === -1)
                        {
                            delete this.effectiveScriptProperties[qname];
                        }
                    }

                    nodeProperties = NodeService.getProperties(this.nodeRef);
                    for (qnameKey in nodeProperties)
                    {
                        // don't map null values
                        if (nodeProperties[qnameKey] !== null)
                        {
                            qname = QName.valueOf(qnameKey);
                            this.nodeProperties[qname] = nodeProperties[qnameKey];
                        }
                    }
                    logger.debug('Loaded {} node property entries for {}', Object.keys(this.nodeProperties).length, this.nodeRef);
                },

                // this overrides standard __get__ from ProxySupport
                // implicitAccess only provided when called internally, not via ProxySupport
                __get__ : function alfresco_node_NodePropertiesMap__get__(prop, implicitAccess)
                {
                    var qname, value, property, tempArray;

                    logger.trace('__get__ called for {}', prop);

                    if (typeof prop === 'string')
                    {
                        // function handles have priority over any node property
                        if (prop in this && typeof this[prop] === 'function')
                        {
                            value = Function.prototype.bind.call(this[prop], this);
                        }
                        else
                        {
                            switch (prop)
                            {
                                case 'length':
                                    value = this.size();
                                    break;
                                default:
                                    qname = QName.valueOf(prop);
                                    if (this.effectiveScriptProperties.hasOwnProperty(qname))
                                    {
                                        value = this.effectiveScriptProperties[qname];
                                    }
                                    else if (this.nodeProperties.hasOwnProperty(qname))
                                    {
                                        value = this.nodeProperties[qname];
                                        property = DictionaryService.getProperty(qname.qname);
                                        if (property !== null && property.multiValued)
                                        {
                                            tempArray = [];
                                            if (value instanceof List)
                                            {
                                                value.forEach(function alfresco_node_NodePropertiesMap__get__forEachListElem(elem)
                                                {
                                                    tempArray.push(ConversionService.convertToScript(elem));
                                                });
                                                value = tempArray;
                                            }
                                            else
                                            {
                                                value = [ ConversionService.convertToScript(value) ];
                                            }
                                        }
                                        else
                                        {
                                            value = ConversionService.convertToScript(value);
                                        }
                                        this.effectiveScriptProperties[qname] = value;

                                        // track all explicitly access property values that can be externally modified
                                        if (implicitAccess !== true && this.explicitlyAccessedProperties.indexOf(qname.prefixString) === -1
                                                && !(typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'))
                                        {
                                            this.explicitlyAccessedProperties.push(qname.prefixString);
                                        }
                                    }
                                    else
                                    {
                                        value = this.inherited(alfresco_node_NodePropertiesMap__get__, arguments);
                                    }
                            }
                        }
                    }

                    logger.debug('__get__ for {} yielded {}', prop, value);

                    return value;
                },

                // this overrides standard __has__ from ProxySupport
                __has__ : function alfresco_node_NodePropertiesMap__has__(prop)
                {
                    var qname, result = false;

                    logger.trace('__has__ called for {}', prop);

                    if (typeof prop === 'string')
                    {
                        if (prop in this)
                        {
                            result = true;
                        }
                        else
                        {
                            switch (prop)
                            {
                                case 'length':
                                    result = true;
                                    break;
                                default:
                                    qname = QName.valueOf(prop);
                                    result = this.effectiveScriptProperties.hasOwnProperty(qname)
                                            || this.nodeProperties.hasOwnProperty(qname);
                            }
                        }
                    }

                    result = result || this.inherited(alfresco_node_NodePropertiesMap__has__, arguments);

                    logger.debug('__has__ for {} yielded {}', prop, result);

                    return result;
                },

                // this overrides standard __put__ from ProxySupport
                __put__ : function alfresco_node_NodePropertiesMap__put__(prop, value)
                {
                    var qname, result;

                    logger.trace('__put__ called for {} and value {}', prop, value);

                    if (typeof prop === 'string')
                    {

                        if (prop in this && typeof this[prop] === 'function')
                        {
                            result = undefined;
                        }
                        else
                        {
                            switch (prop)
                            {
                                case 'length':
                                    result = undefined;
                                    break;
                                default:
                                    qname = QName.valueOf(prop);
                                    // TODO deal with property being a d:content one
                                    this.effectiveScriptProperties[qname] = value || null;

                                    if (this.explicitlyAccessedProperties.indexOf(qname.prefixString) === -1)
                                    {
                                        this.explicitlyAccessedProperties.push(qname.prefixString);
                                    }

                                    result = this.effectiveScriptProperties[qname];
                            }
                        }
                    }

                    logger.debug('__put__ for {} and value {} yielded {}', prop, value, result);

                    return result;
                },

                // this overrides standard __getIds__ from ProxySupport
                __getIds__ : function alfresco_node_NodePropertiesMap__getIds__()
                {
                    var ids = [], qname;

                    logger.trace('__getIds__ called');

                    for (qname in this.effectiveScriptProperties)
                    {
                        if (this.effectiveScriptProperties.hasOwnProperty(qname))
                        {
                            ids.push(qname.prefixString || qname);
                        }
                    }

                    for (qname in this.nodeProperties)
                    {
                        if (this.nodeProperties.hasOwnProperty(qname) && !this.effectiveScriptProperties.hasOwnProperty(qname))
                        {
                            ids.push(qname.prefixString || qname);
                        }
                    }

                    return ids;
                },

                // this overrides standard __getKeys__ from ProxySupport
                __getKeys__ : function alfresco_node_NodePropertiesMap__getKeys__()
                {
                    var ids = [], qname;

                    logger.trace('__getKeys__ called');

                    for (qname in this.effectiveScriptProperties)
                    {
                        if (this.effectiveScriptProperties.hasOwnProperty(qname))
                        {
                            ids.push(qname.prefixString || qname);
                        }
                    }

                    for (qname in this.nodeProperties)
                    {
                        if (this.nodeProperties.hasOwnProperty(qname) && !this.effectiveScriptProperties.hasOwnProperty(qname))
                        {
                            ids.push(qname.prefixString || qname);
                        }
                    }

                    return ids;
                },

                // this overrides standard (empty) __getValues__ from ProxySupport
                __getValues__ : function alfresco_node_NodePropertiesMap__getValues__()
                {
                    var values = [], ids, idx, value;

                    logger.trace('__getValues__ called');

                    ids = this.__getIds__();
                    for (idx = 0; idx < ids.length; idx++)
                    {
                        value = this.__get__(ids[idx], true);
                        if (value !== null)
                        {
                            values.push(value);
                        }
                    }

                    return values;
                },

                // this overrides standard __delete__ from ProxySupport
                __delete__ : function alfresco_node_NodePropertiesMap__delete__(prop)
                {
                    var qname, result;

                    logger.trace('__delete__ called for {}', prop);

                    if (typeof prop === 'string')
                    {
                        if (prop in this && typeof this[prop] === 'function')
                        {
                            result = false;
                        }
                        else
                        {
                            switch (prop)
                            {
                                case 'length':
                                    break;
                                default:
                                    qname = QName.valueOf(prop);
                                    if (this.effectiveScriptProperties.hasOwnProperty(qname) || this.nodeProperties.hasOwnProperty(qname))
                                    {
                                        this.effectiveScriptProperties[qname] = null;

                                        if (this.explicitlyAccessedProperties.indexOf(qname.prefixString) === -1)
                                        {
                                            this.explicitlyAccessedProperties.push(qname.prefixString);
                                        }

                                        result = true;
                                    }
                                    else
                                    {
                                        result = false;
                                    }
                            }
                        }
                    }

                    logger.debug('__delete__ for {} yielded {}', prop, result);

                    return result;
                },

                /**
                 * Resets the internal state of this instance, dropping any potential property modifications and reloading all properties
                 * from the actual node.
                 * 
                 * @instance
                 * @function
                 */
                reset : function alfresco_node_NodePropertiesMap__reset()
                {
                    var qname;

                    for (qname in this.effectiveScriptProperties)
                    {
                        if (this.effectiveScriptProperties.hasOwnProperty(qname))
                        {
                            delete this.effectiveScriptProperties[qname];
                        }
                    }

                    this.explicitlyAccessedProperties.splice(0, this.explicitlyAccessedProperties.length);

                    this._loadNodeProperties();
                },

                /**
                 * Saves the internal state of this instance, persisting any potential property modifications and reloading all properties
                 * from the actual node. This operation will also respect the FileFolderService contract for renaming nodes.
                 * 
                 * @instance
                 * @function
                 */
                save : function alfresco_node_NodePropertiesMap__save()
                {
                    var propertiesToAdd, name, qnameType;

                    propertiesToAdd = this.__getModifiedPropertiesMap();

                    // specific rename handling for FileFolderService contract
                    if (propertiesToAdd.containsKey(ContentModel.PROP_NAME))
                    {
                        name = propertiesToAdd.get(ContentModel.PROP_NAME);
                        if (typeof name === 'string')
                        {
                            qnameType = NodeService.getType(this.nodeRef);

                            if ((DictionaryService.isSubClass(qnameType, ContentModel.TYPE_FOLDER) && !DictionaryService.isSubClass(
                                    qnameType, ContentModel.TYPE_SYSTEM_FOLDER))
                                    || DictionaryService.isSubClass(qnameType, ContentModel.TYPE_CONTENT))
                            {
                                FileFolderService.rename(this.nodeRef, name);
                            }
                        }
                    }

                    if (!propertiesToAdd.isEmpty())
                    {
                        NodeService.addProperties(this.nodeRef, propertiesToAdd);
                    }

                    this.reset();
                },

                /**
                 * Retrieves the Java map-based representation of all the properties that would be persisted by a call to
                 * [save]{@link module:alfresco/node/NodePropertiesMap#save} at this time. This operation is intended for other modules in this
                 * package that may need to persist current properties without going through the call to save.
                 * 
                 * @instance
                 * @protected
                 * @function
                 * @returns {Map} the Java map instance holding all properties that would be persisted by a call to
                 *          [save]{@link module:alfresco/node/NodePropertiesMap#save} at this time
                 */
                _getModifiedPropertiesMap : function alfresco_node_NodePropertiesMap__getModifiedPropertiesMap()
                {
                    var propertiesToAdd, arrayValueConverter, qname, value, arr, javaValue, idx;

                    propertiesToAdd = new HashMap();
                    arrayValueConverter = function alfresco_node_NodePropertiesMap__save_forEachValueArrElem(element, index, arr)
                    {
                        var converted = ConversionService.convertToJava(element);
                        arr[index] = converted;
                    };

                    // we only process properties explicitly set or accessed (w/ potential external modification)
                    for (idx = 0; idx < this.explicitlyAccessedProperties.length; idx++)
                    {
                        qname = QName.valueOf(this.explicitlyAccessedProperties[idx]);
                        value = this.effectiveScriptProperties[qname];

                        if (value === null)
                        {
                            propertiesToAdd.put(qname.qname, null);
                        }
                        else if (Array.isArray(value))
                        {
                            arr = [].concat(value);
                            arr.forEach(arrayValueConverter);
                            javaValue = Java.to(arr, List);
                            propertiesToAdd.put(qname.qname, javaValue);
                        }
                        else
                        {
                            javaValue = ConversionService.convertToJava(value);
                            propertiesToAdd.put(qname.qname, javaValue);
                        }
                    }
                    return propertiesToAdd;
                },

                /**
                 * Determines the number of properties set on the node.
                 * 
                 * @instance
                 * @function
                 * @returns {number} the number of non-null properties on the node
                 */
                size : function alfresco_node_NodePropertiesMap__size()
                {
                    var ids, size;

                    ids = this.__getIds__();
                    size = ids.length;

                    return size;
                },

                /**
                 * Provides a human-readable representation of the properties of the node.
                 * 
                 * @instance
                 * @function
                 * @returns {string} human-readable presentation of the node properties
                 */
                toString : function alfresco_node_NodePropertiesMap__toString()
                {
                    // TODO
                    return 'NodePropertiesMap';
                }

            });
        });