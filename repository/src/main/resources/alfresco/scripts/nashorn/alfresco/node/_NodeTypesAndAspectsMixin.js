/* globals -require */
/**
 * This module provides a script abstraction around Alfresco node types and aspects.
 * 
 * @module alfresco/node/_NodeTypesAndAspectsMixin
 * @extends module:_base/ProxySupport
 * @requires module:_base/declare
 * @requires module:_base/lang
 * @requires module:alfresco/common/QName
 * @requires module:_base/ConversionService
 * @requires module:alfresco/foundation/DictionaryService
 * @requires module:alfresco/foundation/NodeService
 * @requires module:_base/logger
 * @requires module:nashorn!Java
 * @author Axel Faust
 */
define([ '_base/declare', '_base/ProxySupport', '_base/lang', '../common/QName', '_base/ConversionService',
        '../foundation/DictionaryService', '../foundation/NodeService', '_base/logger', 'nashorn!Java' ],
        function alfresco_node_NodeTypesAndAspectsMixin__root(declare, ProxySupport, lang, QName, ConversionService, DictionaryService,
                NodeService, logger, Java)
        {
            'use strict';
            var List, HashMap;

            List = Java.type('java.util.List');
            HashMap = Java.type('java.util.HashMap');

            return declare([ ProxySupport ], {

                '--proxy-support-enabled' : true,

                '--proxy-getter-redirection-enabled' : true,

                '--proxy-setter-redirection-enabled' : true,

                '--proxy-virtual-getters-enabled' : true,

                /**
                 * The type qname for this node. Setting this property will try to specialize the type of the node and fail if the types are
                 * incompatible.
                 * 
                 * @var typeQName
                 * @type {module:alfresco/common/QName}
                 * @instance
                 * @memberof module:alfresco/node/_NodeTypesAndAspectsMixin
                 */
                /**
                 * Retrieves the type qname of this node
                 * 
                 * @instance
                 * @return {module:alfresco/common/QName} the type qname
                 */
                // due to potential case diferences (xy.qnameType / xy.qNameType) we provide this getter
                getTypeQName : function alfresco_node_NodeTypesAndAspectsMixin__getTypeQName()
                {
                    var typeQName;
                    if (!this.hasOwnProperty('_typeQName'))
                    {
                        logger.debug('Initialising cached type of {}', this.nodeRef);
                        typeQName = QName.valueOf(NodeService.getType(this.nodeRef));
                        // just an internally cached value
                        Object.defineProperty(this, '_typeQName', {
                            value : typeQName,
                            writable : true,
                            configurable : true
                        });
                    }

                    return this._typeQName;
                },

                /**
                 * Sets the type of the node to a specialized sub-type if possible.
                 * 
                 * @instance
                 * @param {module:alfresco/common/QName}
                 *            typeQName the qname of the sub-type for the node
                 * @returns {module:alfresco/common/QName} the qname the new type
                 */
                setTypeQName : function alfresco_node_NodeTypesAndAspectsMixin__setTypeQName(typeQName)
                {
                    var result;
                    if (typeQName === this.getTypeQName() || this.getTypeQName().qname.equals(typeQName.qname || null))
                    {
                        result = typeQName;
                    }
                    else if (!this.specializeType(typeQName))
                    {
                        throw new Error('Node type could not be specialized to ' + typeQName);
                    }
                    else
                    {
                        result = this.getTypeQName();
                    }

                    return result;
                },

                /**
                 * The long form string representation of the type of this node. Setting this property will try to specialize the type of
                 * the node and fail if the types are incompatible.
                 * 
                 * @var type
                 * @type {string}
                 * @instance
                 * @memberof module:alfresco/node/_NodeTypesAndAspectsMixin
                 */
                /**
                 * Retrieves the long form string representation of the type of this node
                 * 
                 * @instance
                 * @return {string} the long form string representation of the type
                 */
                getType : function alfresco_node_NodeTypesAndAspectsMixin__getType()
                {
                    var qnameType, type;

                    qnameType = this.getTypeQName();
                    type = qnameType.fullString;

                    return type;
                },

                /**
                 * Sets the type of the node to a specialized sub-type if possible.
                 * 
                 * @instance
                 * @param {string}
                 *            type the long form string representation of the sub-type for the node
                 * @returns {string} the long form string representation of the new type
                 */
                setType : function alfresco_node_NodeTypesAndAspectsMixin__setType(type)
                {
                    var result;
                    if (type === this.getType())
                    {
                        result = type;
                    }
                    else if (!this.specializeType(type))
                    {
                        throw new Error('Node type could not be specialized to ' + type);
                    }
                    else
                    {
                        result = this.getType();
                    }

                    return result;
                },

                /**
                 * The prefixed string representation of the type of this node. Setting this property will try to specialize the type of the
                 * node and fail if the types are incompatible.
                 * 
                 * @var typeShort
                 * @type {string}
                 * @instance
                 * @memberof module:alfresco/node/_NodeTypesAndAspectsMixin
                 */
                /**
                 * Retrieves the prefixed string representation of the type of this node
                 * 
                 * @instance
                 * @return {string} the prefixed string representation of the type
                 */
                getTypeShort : function alfresco_node_NodeTypesAndAspectsMixin__getTypeShort()
                {
                    var qnameType, type;

                    qnameType = this.getTypeQName();
                    type = qnameType.prefixString;

                    return type;
                },

                /**
                 * Sets the type of the node to a specialized sub-type if possible.
                 * 
                 * @instance
                 * @param {string}
                 *            typeShort the prefixed string representation of the sub-type for the node
                 * @returns {string} the prefixed string representation of the new type
                 */
                setTypeShort : function alfresco_node_NodeTypesAndAspectsMixin__setTypeShort(typeShort)
                {
                    var result;
                    if (typeShort === this.getTypeShort())
                    {
                        result = typeShort;
                    }
                    else if (!this.specializeType(typeShort))
                    {
                        throw new Error('Node type could not be specialized to ' + typeShort);
                    }
                    else
                    {
                        result = this.getTypeShort();
                    }

                    return result;
                },

                /**
                 * Sets the type of the node to a specialized sub-type.
                 * 
                 * @instance
                 * @param {string|QName|module:alfresco/common/QName}
                 *            type the sub-type for the node
                 * @returns {boolean} true if the node was specialized, false otherwise
                 */
                specializeType : function alfresco_node_NodeTypesAndAspectsMixin__specializeType(type)
                {
                    var qname, currentTypeQName, result = false;

                    qname = QName.valueOf(type);
                    if (qname === undefined || qname === null)
                    {
                        throw new Error('type is a required parameter');
                    }

                    currentTypeQName = this.getTypeQName();

                    if (!currentTypeQName.qname.equals(qname.qname) && DictionaryService.isSubClass(qname.qname, currentTypeQName.qname))
                    {
                        NodeService.setType(this.nodeRef, qname.qname);
                        // update internally cached value
                        this._typeQName = qname;
                        result = true;
                    }

                    return result;
                },

                /**
                 * Checks if the node has a type that is the same or a sub-type of a specified base type.
                 * 
                 * @instance
                 * @param {string|QName|module:alfresco/common/QName}
                 *            type the type to check
                 * @return {boolean} true if the node is a sub-type, false otherwise
                 */
                isSubType : function alfresco_node_NodeTypesAndAspectsMixin__isSubType(type)
                {
                    var qname, currentTypeQName, result = false;

                    qname = QName.valueOf(type);
                    if (qname === undefined || qname === null)
                    {
                        throw new Error('type is a required parameter');
                    }

                    currentTypeQName = this.getTypeQName();
                    result = DictionaryService.isSubClass(currentTypeQName.qname, qname.qname);

                    return result;
                },

                // we do not include getIsDocument, getIsContainer, getIsLinkToContainer, getIsLinkToDocument or getIsCategory
                // these are redundant to simply using isSubType (they may be provided by a custom mixin though)

                /**
                 * The array of long form string representations for all aspects applied to the node
                 * 
                 * @var aspects
                 * @type {string[]}
                 * @instance
                 * @readonly
                 * @memberof module:alfresco/node/_NodeTypesAndAspectsMixin
                 */
                /**
                 * Retrieves the aspects applied to the node in their long form string representation
                 * 
                 * @instance
                 * @returns {string[]} the applied aspects in long form string representation
                 */
                getAspects : function alfresco_node_NodeTypesAndAspectsMixin__getAspects()
                {
                    var aspectsLong, aspects;

                    aspects = this.getAspectsQName();
                    aspectsLong = [];

                    aspects.forEach(function alfresco_node_NodeTypesAndAspectsMixin__getAspects__forEachAspect(aspect)
                    {
                        aspectsLong.push(aspect.fullString);
                    });

                    return aspectsLong;
                },

                /**
                 * The array of prefixed string representations for all aspects applied to the node
                 * 
                 * @var aspectsShort
                 * @type {string[]}
                 * @instance
                 * @readonly
                 * @memberof module:alfresco/node/_NodeTypesAndAspectsMixin
                 */
                /**
                 * Retrieves the aspects applied to the node in their prefixed string representation
                 * 
                 * @instance
                 * @returns {string[]} the applied aspects in prefixed string representation
                 */
                getAspectsShort : function alfresco_node_NodeTypesAndAspectsMixin__getAspectsShort()
                {
                    var aspectsShort, aspects;
                    aspects = this.getAspectsQName();
                    aspectsShort = [];
                    aspects.forEach(function alfresco_node_NodeTypesAndAspectsMixin__getAspectsShort__forEachAspect(aspect)
                    {
                        aspectsShort.push(aspect.prefixString);
                    });

                    return aspectsShort;
                },

                /**
                 * The array of applied aspects
                 * 
                 * @var aspectsQName
                 * @type {module:alfresco/common/QName[]}
                 * @instance
                 * @readonly
                 * @memberof module:alfresco/node/_NodeTypesAndAspectsMixin
                 */
                /**
                 * Retrieves the aspects applied to the node
                 * 
                 * @instance
                 * @returns {module:alfresco/common/QName[]} the applied aspects
                 */
                getAspectsQName : function alfresco_node_NodeTypesAndAspectsMixin_getAspectsQName()
                {
                    var aspects, aspectQNames;
                    if (!this.hasOwnProperty('_aspectQNames'))
                    {
                        logger.debug('Initialising cached aspects of {}', this.nodeRef);

                        aspects = NodeService.getAspects(this.nodeRef);
                        aspectQNames = [];
                        aspects.forEach(function alfresco_node_NodeTypesAndAspectsMixin__getAspectsQName_forEachAspect(aspect)
                        {
                            aspectQNames.push(QName.valueOf(aspect));
                        });

                        // just an internally cached value
                        Object.defineProperty(this, '_aspectQNames', {
                            value : aspectQNames,
                            configurable : true
                        });
                    }

                    // shallow copy to avoid co-modification
                    return this._aspectQNames.slice(0);
                },

                /**
                 * Checks if the node has a specific aspect applied.
                 * 
                 * @instance
                 * @param {string|QName|module:alfresco/common/QName}
                 *            aspect the aspect to check
                 * @return {boolean} true if the node has the aspect applied, false otherwise
                 */
                hasAspect : function alfresco_node_NodeTypesAndAspectsMixin__isSubType(aspect)
                {
                    var qname, result = false;

                    qname = QName.valueOf(aspect);
                    if (qname === undefined || qname === null)
                    {
                        throw new Error('aspect is a required parameter');
                    }

                    if (this.hasOwnProperty('_aspectQNames'))
                    {
                        result = this._aspectQNames.indexOf(qname) !== -1;
                    }
                    else
                    {
                        result = NodeService.hasAspect(this.nodeRef, qname.qname);
                    }

                    return result;
                },

                /**
                 * Applies an aspect to the node, optionally adding relevant aspect properties too.
                 * 
                 * @instance
                 * @param {string|QName|module:alfresco/common/QName}
                 *            aspect the aspect to apply
                 * @param {object}
                 *            properties the properties to add to the node with this operation
                 * @returns {boolean} true if a new aspect was added, false otherwise i.e. if the aspect was already applied
                 */
                addAspect : function alfresco_node_NodeTypesAndAspectsMixin__addAspect(aspect, properties)
                {
                    var aspectQName, propertiesToAdd, arrayValueConverter, result = false;

                    aspectQName = QName.valueOf(aspect);
                    if (aspectQName === undefined || aspectQName === null)
                    {
                        throw new Error('aspect is a required parameter');
                    }

                    logger.trace('addAspect called on {} for aspect {}', this.nodeRef, aspect);

                    if (lang.isObject(properties, null, true))
                    {
                        logger.debug('Extracting properties to add in application of aspect {}', aspect);
                        if (logger.traceEnabled)
                        {
                            logger.trace('addAspect on {} for aspect {} was provided with properties object {}', this.nodeRef, aspect, JSON
                                    .stringify(properties));
                        }

                        propertiesToAdd = new HashMap();

                        arrayValueConverter = function alfresco_node_NodeTypesAndAspectsMixin__addAspect_forEachValueArrElem(element,
                                index, arr)
                        {
                            var converted = ConversionService.convertToJava(element);
                            arr[index] = converted;
                        };

                        Object.keys(properties).forEach(function alfresco_node_NodeTypesAndAspectsMixin__addAspect_forEachProperty(key)
                        {
                            var qname, value, arr, javaValue;

                            qname = QName.valueOf(key);
                            value = properties[key];

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
                        });
                    }

                    // Note: We do not include the hacky logic from ScriptNode Rhino class concerning autoVersion/autoVersionProperties
                    // (ALF-13719 and MNT-9369) - we always respect client-supplied properties and/or model default
                    // additionally we respect client-supplied cm:initialVersion, which Rhino ScriptNode simply ignores

                    if (!NodeService.hasAspect(this.nodeRef, aspectQName.qname))
                    {
                        result = true;
                    }

                    NodeService.addAspect(this.nodeRef, aspectQName.qname, propertiesToAdd || null);

                    logger.debug('Aspect {} and properties applied to {} (new aspect: {})', aspect, this.nodeRef, result);

                    // reset cache
                    if (this.hasOwnProperty('_aspectQNames'))
                    {
                        logger.trace('Resetting cached aspects for {}', this.nodeRef);
                        delete this._aspectQNames;
                    }

                    return result;
                },

                /**
                 * Removes an aspect from the node.
                 * 
                 * @instance
                 * @param {string|QName|module:alfresco/common/QName}
                 *            aspect the aspect to remove
                 * @returns {boolean} true if an aspect was removed, false otherwise i.e. if the aspect was not previously applied or wasn't
                 *          effectively removed (i.e. due to being a mandatory aspect)
                 */
                removeAspect : function alfresco_node_NodeTypesAndAspectsMixin__removeAspect(aspect)
                {
                    var aspectQName, result = false;

                    aspectQName = QName.valueOf(aspect);
                    if (aspectQName === undefined || aspectQName === null)
                    {
                        throw new Error('aspect is a required parameter');
                    }

                    logger.trace('removeAspect called on {} for aspect {}', this.nodeRef, aspect);

                    if (NodeService.hasAspect(this.nodeRef, aspectQName.qname))
                    {
                        result = true;
                    }

                    NodeService.removeAspect(this.nodeRef, aspectQName.qname);

                    if (result === true && NodeService.hasAspect(this.nodeRef, aspectQName.qname))
                    {
                        result = false;
                    }

                    logger.debug('Aspect {} removed from {} (removal effective: {})', aspect, this.nodeRef, result);

                    // reset cache
                    if (this.hasOwnProperty('_aspectQNames'))
                    {
                        logger.trace('Resetting cached aspects for {}', this.nodeRef);
                        delete this._aspectQNames;
                    }

                    return false;
                },

                /**
                 * This function provides save handling for a node, ensuring that all changed data will be persisted and next calls to
                 * operations are guaranteed to reflect the current node state. Overrides of this function must always make sure to call
                 * inherited().
                 */
                save : function alfresco_node_NodeTypesAndAspectsMixin__save()
                {
                    this.inherited(alfresco_node_NodeTypesAndAspectsMixin__save, arguments);

                    // aspects may have changed - reset cache
                    if (this.hasOwnProperty('_aspectQNames'))
                    {
                        logger.trace('Resetting cached aspects for {}', this.nodeRef);
                        delete this._aspectQNames;
                    }
                },

                /**
                 * This function provides reset handling of a node, ensuring that all changed data will be discarded and next calls to
                 * operations are guaranteed to reflect the current node state. Overrides of this function must always make sure to call
                 * inherited().
                 */
                reset : function alfresco_node_NodeTypesAndAspectsMixin__reset()
                {
                    this.inherited(alfresco_node_NodeTypesAndAspectsMixin__reset, arguments);
                    this.resetTypeCaches();
                },

                /**
                 * This function provides a specific hook for other modules to call to reset only cached data regarding node types and
                 * aspects when other operations may have changed the specific node state.
                 */
                resetTypeCaches : function alfresco_node_NodeTypesAndAspectsMixin__resetTypeCaches()
                {
                    // reset cached values (that may have been changed externally)
                    if (!this.hasOwnProperty('_typeQName'))
                    {
                        logger.debug('Resetting cached type for {}', this.nodeRef);
                        delete this._typeQName;
                    }

                    if (this.hasOwnProperty('_aspectQNames'))
                    {
                        logger.debug('Resetting cached aspects for {}', this.nodeRef);
                        delete this._aspectQNames;
                    }
                }
            });
        });