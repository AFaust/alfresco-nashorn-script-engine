/* globals -require */
define([ '_base/declare', '_base/JavaConvertableMixin', '_base/ProxySupport', '../foundation/NamespaceService', '_base/logger',
        'nashorn!Java' ], function alfresco_common_QName__root(declare, JavaConvertableMixin, ProxySupport, NamespaceService, logger, Java)
{
    'use strict';
    var QName, IllegalArgumentException, NashornScriptModel, Module, qnameCache;

    QName = Java.type('org.alfresco.service.namespace.QName');
    IllegalArgumentException = Java.type('java.lang.IllegalArgumentException');
    NashornScriptModel = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModel');

    qnameCache = NashornScriptModel.newAssociativeContainer();

    /**
     * This module provides a script abstraction around the Java type QName.
     * 
     * @module alfresco/common/QName
     * @requires module:_base/declare
     * @requires module:alfresco/foundation/NamespaceService
     * @requires module:_base/logger
     * @mixes module:_base/JavaConvertableMixin
     * @mixes module:_base/ProxySupport
     */
    // we have to encapsulate QName as we can't Java.extend due to private constructor
    // normal Java interop + extension could have saved lots of boilerplate
    Module = declare([ JavaConvertableMixin, ProxySupport ], {

        '--proxy-support-enabled' : true,

        '--proxy-getter-redirection-enabled' : true,

        '--proxy-virtual-getters-enabled' : true,

        _internalJavaValueProperty : 'qname',

        classConstructor : function alfresco_common_QName__contructor(qname)
        {
            var internalQName;

            if (typeof qname === 'string')
            {
                internalQName = QName.resolveToQName(NamespaceService, qname);
            }
            else if (qname instanceof QName)
            {
                internalQName = qname;
            }
            else if (qname !== undefined && qname !== null)
            {
                internalQName = QName.resolveToQName(NamespaceService, String(qname));
            }

            if (internalQName === null)
            {
                throw new IllegalArgumentException('qname value invalid: ' + qname);
            }

            // this is intended to be our only apparent property
            // defined this way since we want to be immutable
            Object.defineProperty(this, 'qname', {
                value : internalQName,
                enumerable : true
            });
        },

        /**
         * The Java QName object for this instance
         * 
         * @var qname
         * @type {QName}
         * @instance
         * @readonly
         * @memberof module:alfresco/common/QName
         */
        /**
         * Retrieves the Java QName object for this instance
         * 
         * @instance
         * @returns {QName} the Java QName object for this instance
         */
        // due to potential case diferences (xy.qname / xy.qName) we provide this getter
        getQName : function alfresco_common_QName__getQName()
        {
            return this.qname;
        },

        /**
         * The local name for this instance
         * 
         * @var localName
         * @type {string}
         * @instance
         * @readonly
         * @memberof module:alfresco/common/QName
         */
        /**
         * Retrieves the local name for this instance
         * 
         * @instance
         * @returns {string} the local name for this instance
         */
        // could have been avoided with Java.extend
        getLocalName : function alfresco_common_QName__getLocalName()
        {
            return this.qname.localName;
        },

        /**
         * The namespace URI for this instance
         * 
         * @var namespaceURI
         * @type {string}
         * @instance
         * @readonly
         * @memberof module:alfresco/common/QName
         */
        /**
         * Retrieves the namespace URI for this instance
         * 
         * @instance
         * @returns {string} the namespace URI for this instance
         */
        // could have been avoided with Java.extend
        getNamespaceURI : function alfresco_common_QName__getNamespaceURI()
        {
            return this.qname.namespaceURI;
        },

        /**
         * The prefix string representation for this instance
         * 
         * @var prefixString
         * @type {string}
         * @instance
         * @readonly
         * @memberof module:alfresco/common/QName
         */
        /**
         * Retrieves the prefix string representation for this instance
         * 
         * @instance
         * @returns {string} the prefix string representation for this instance
         */
        // could have been overriden via Java.extend
        getPrefixString : function alfresco_common_QName__getPrefixString()
        {
            if (!this.hasOwnProperty('prefixString'))
            {
                logger.debug('Defining prefixString on {}', this.qname);
                // just a cached value to avoid redundant toPrefixString execution
                Object.defineProperty(this, 'prefixString', {
                    value : this.qname.toPrefixString(NamespaceService),
                    enumerable : true
                });
            }
            return this.prefixString;
        },

        /**
         * The long form string representation for this instance
         * 
         * @var fullString
         * @type {string}
         * @instance
         * @readonly
         * @memberof module:alfresco/common/QName
         */
        /**
         * Retrieves long form string representation for this instance
         * 
         * @instance
         * @returns {string} the long form string representation for this instance
         */
        getFullString : function alfresco_common_QName__getPrefixString()
        {
            if (!this.hasOwnProperty('fullString'))
            {
                logger.debug('Defining fullString on {}', this.qname);
                // just a cached value
                Object.defineProperty(this, 'fullString', {
                    value : String(this.qname)
                });
            }
            return this.fullString;
        },

        /**
         * Provides a human readable string representation of this instance based on [prefixString]{@link module:alfresco/common/QName#prefixString}
         * 
         * @instance
         * @returns {string} the human readable string representation
         */
        toString : function alfresco_common_QName__toString()
        {
            // in script the prefixString is preferred
            return this.getPrefixString();
        }

    });

    /**
     * Retrieves an instance of this module for a provided qname
     * 
     * @memberof module:alfresco/common/QName
     * @param {string|QName}
     *            qname the qname for which to retrieve an instance of this module - this can be either a Java QName object or a prefix /
     *            long form string representation of one
     * @returns {module:alfresco/common/QName} the qname instance
     */
    Module.valueOf = function alfresco_common_QName__valueOf(qname)
    {
        var result;

        logger.trace('valueOf called for {}', qname);

        if (qname instanceof QName)
        {
            result = qnameCache[qname];

            if (result === null)
            {
                result = new Module(qname);
                qnameCache[qname] = result;
                qnameCache[result.prefixString] = result;
            }
        }
        else if (qname !== undefined && qname !== null)
        {
            if (typeof qname.isInstanceOf === 'function' && qname.isInstanceOf(Module))
            {
                result = qname;
            }
            else
            {
                result = qnameCache[qname];

                if (result === null)
                {
                    result = new Module(qname);
                    qnameCache[qname] = result;
                    qnameCache[result.qname] = result;
                    qnameCache[result.prefixString] = result;
                }
            }
        }
        else
        {
            result = null;
        }

        logger.debug('valueOf for {} yielded {}', qname, result);

        return result;
    };

    Object.freeze(Module);
    Object.freeze(Module.valueOf);

    return Module;
});