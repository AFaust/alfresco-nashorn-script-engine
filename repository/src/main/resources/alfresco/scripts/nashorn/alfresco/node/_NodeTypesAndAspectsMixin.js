/* globals -require */
/**
 * This module provides a script abstraction around Alfresco node types and aspects.
 * 
 * @module alfresco/node/_NodeTypesAndAspectsMixin
 * @requires module:_base/declare
 * @requires module:alfresco/common/QName
 * @requires module:_base/ConversionService
 * @requires module:alfresco/foundation/DictionaryService
 * @requires module:alfresco/foundation/NodeService
 * @requires module:_base/logger
 * @requires module:nashorn!Java
 * @mixes module:_base/ProxySupport
 */
define([ '_base/declare', '_base/ProxySupport', '../common/QName', '_base/ConversionService', '../foundation/DictionaryService',
        '../foundation/NodeService', 'nashorn!Java' ], function alfresco_node_NodeTypesAndAspectsMixin_root(declare, ProxySupport, QName,
        ConversionService, DictionaryService, NodeService, Java)
{
    'use strict';
    var isObject, List, HashMap;

    List = Java.type('java.util.List');
    HashMap = Java.type('java.util.HashMap');

    isObject = function amd__isObject(o)
    {
        var result = o !== undefined && o !== null && Object.prototype.toString.call(o) === '[object Object]';
        return result;
    };

    return declare([ ProxySupport ], {

        '--proxy-support-enabled' : true,

        '--proxy-getter-redirection-enabled' : true,

        '--proxy-setter-redirection-enabled' : true,

        '--proxy-virtual-getters-enabled' : true,

        /**
         * The type qname for this node. Setting this property will try to specialize the type of the node and fail if the types are
         * incompatible.
         * 
         * @var qnameType
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
        getQnameType : function alfresco_node_NodeTypesAndAspectsMixin__getQnameType()
        {
            return this.getQNameType();
        },

        /**
         * Sets the type of the node to a specialized sub-type if possible.
         * 
         * @instance
         * @param {module:alfresco/common/QName}
         *            qnameType the qname of the sub-type for the node
         * @returns {module:alfresco/common/QName} the qname the new type
         */
        setQnameType : function alfresco_node_NodeTypesAndAspectsMixin__setQnameType(qnameType)
        {
            return this.setQNameType(qnameType);
        },

        /**
         * The type qname for this node - this is equivalent to [qnameType]{@link module:alfresco/node/_NodeTypesAndAspectsMixin#qnameType}
         * for compatibility reasons with legacy API. Setting this property will try to specialize the type of the node and fail if the
         * types are incompatible.
         * 
         * @var qNameType
         * @type {module:alfresco/common/QName}
         * @instance
         * @memberof module:alfresco/node/_NodeTypesAndAspectsMixin
         */
        /**
         * Retrieves the type qname of this node - this is equivalent to [getQnameType]{@link module:alfresco/node/_NodeTypesAndAspectsMixin#getQnameType}
         * for compatibility reasons with legacy API.
         * 
         * @instance
         * @return {module:alfresco/common/QName} the type qname
         */
        getQNameType : function alfresco_node_NodeTypesAndAspectsMixin__getQNameType()
        {
            var qnameType;
            if (!this.hasOwnProperty('_qnameType'))
            {
                qnameType = QName.valueOf(NodeService.getType(this.nodeRef));
                // just an internally cached value
                Object.defineProperty(this, '_qnameType', {
                    value : qnameType,
                    writable : true,
                    configurable : true
                });
            }

            return this._qnameType;
        },

        /**
         * Sets the type of the node to a specialized sub-type if possible - this is equivalent to [setQnameType]{@link module:alfresco/node/_NodeTypesAndAspectsMixin#setQnameType}
         * for compatibility reasons with legacy API.
         * 
         * @instance
         * @param {module:alfresco/common/QName}
         *            qnameType the qname of the sub-type for the node
         * @returns {module:alfresco/common/QName} the qname the new type
         */
        setQNameType : function alfresco_node_NodeTypesAndAspectsMixin__setQNameType(qnameType)
        {
            var result;
            if (qnameType === this.getQNameType() || this.getQNameType().qname.equals(qnameType.qname || null))
            {
                result = qnameType;
            }
            else if (!this.specializeType(qnameType))
            {
                throw new Error('Node type could not be specialized to ' + qnameType);
            }
            else
            {
                result = this.getQNameType();
            }

            return result;
        },

        /**
         * The long form string representation of the type of this node. Setting this property will try to specialize the type of the node
         * and fail if the types are incompatible.
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

            qnameType = this.getQNameType();
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
         * The prefixed string representation of the type of this node. Setting this property will try to specialize the type of the node
         * and fail if the types are incompatible.
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

            qnameType = this.getQNameType();
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

            currentTypeQName = this.getQNameType();

            if (!currentTypeQName.qname.equals(qname.qname) && DictionaryService.isSubClass(qname.qname, currentTypeQName.qname))
            {
                NodeService.setType(this.nodeRef, qname.qname);
                // update internally cached value
                this._qnameType = qname;
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

            currentTypeQName = this.getQNameType();
            result = DictionaryService.isSubClass(currentTypeQName.qname, qname.qname);

            return result;
        },

        /**
         * The array of long form string representations for all aspects applied to the node
         * 
         * @var aspects
         * @type {array}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/_NodeTypesAndAspectsMixin
         */
        /**
         * Retrieves the aspects applied to the node in their long form string representation
         * 
         * @instance
         * @returns {array} the applied aspects in long form string representation
         */
        getAspects : function alfresco_node_NodeTypesAndAspectsMixin__getAspects()
        {
            var aspectsLong, aspects;
            aspects = this._getAspectsQName();
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
         * @type {array}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/_NodeTypesAndAspectsMixin
         */
        /**
         * Retrieves the aspects applied to the node in their prefixed string representation
         * 
         * @instance
         * @returns {array} the applied aspects in prefixed string representation
         */
        getAspectsShort : function alfresco_node_NodeTypesAndAspectsMixin__getAspectsShort()
        {
            var aspectsShort, aspects;
            aspects = this._getAspectsQName();
            aspectsShort = [];
            aspects.forEach(function alfresco_node_NodeTypesAndAspectsMixin__getAspectsShort__forEachAspect(aspect)
            {
                aspectsShort.push(aspect.prefixString);
            });

            return aspectsShort;
        },

        /**
         * Retrieves the aspects applied to the node
         * 
         * @instance
         * @private
         * @returns {array} the applied aspects
         */
        _getAspectsQName : function alfresco_node_NodeTypesAndAspectsMixin__getAspectsQName()
        {
            var aspects, aspectQNames;
            if (!this.hasOwnProperty('_aspectQNames'))
            {
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

            return this._aspectQNames;
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

            result = NodeService.hasAspect(this.nodeRef, qname.qname);

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

            if (properties !== null && isObject(properties))
            {
                propertiesToAdd = new HashMap();

                arrayValueConverter = function alfresco_node_NodeTypesAndAspectsMixin__addAspect_forEachValueArrElem(element, index, arr)
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

            // reset cache
            if (this.hasOwnProperty('_aspectQNames'))
            {
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

            if (NodeService.hasAspect(this.nodeRef, aspectQName.qname))
            {
                result = true;
            }

            NodeService.removeAspect(this.nodeRef, aspectQName.qname);

            if (result === true && NodeService.hasAspect(this.nodeRef, aspectQName.qname))
            {
                result = false;
            }

            // reset cache
            if (this.hasOwnProperty('_aspectQNames'))
            {
                delete this._aspectQNames;
            }

            return false;
        },

        save : function alfresco_node_NodeTypesAndAspectsMixin__save()
        {
            this.inherited(arguments);

            // aspects may have changed - reset cache
            if (this.hasOwnProperty('_aspectQNames'))
            {
                delete this._aspectQNames;
            }
        },

        reset : function alfresco_node_NodeTypesAndAspectsMixin__reset()
        {
            this.inherited(arguments);

            // reset cached values (that may have been changed externally)
            if (!this.hasOwnProperty('_qnameType'))
            {
                delete this._qnameType;
            }

            if (this.hasOwnProperty('_aspectQNames'))
            {
                delete this._aspectQNames;
            }
        }
    });
});