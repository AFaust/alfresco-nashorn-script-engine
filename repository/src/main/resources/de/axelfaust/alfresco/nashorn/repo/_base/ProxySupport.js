/**
 * @module _base/ProxySupport
 * @author Axel Faust
 */
/* globals -require */
define(
        [ './declare', 'nashorn!JSAdapter', 'nashorn!Java', './logger' ],
        function ProxySupport__define(declare, JSAdapter, Java, logger)
        {
            'use strict';
            var noSuchPropertyStackKey, proxyEnabledKey, adapteeFunctionNames, Locale, boolGetterNames, getterNames, setterNames, publicPropertyPattern, getterPattern;

            noSuchPropertyStackKey = '--proxy-no-such-property-stack';
            proxyEnabledKey = '--proxy-support-enabled';

            adapteeFunctionNames = [ '__get__', '__put__', '__has__', '__delete__', '__getIds__', '__getKeys__', '__getValues__',
                    '__call__', '__new__' ];

            Locale = Java.type('java.util.Locale');

            // we use publicPropertyPattern/getterPattern only to determine "exposable" properties via getIds/getKeys/getValues
            publicPropertyPattern = /^[a-zA-Z0-9]/;
            getterPattern = /^(get|is)/;

            // global function name resolution caches
            boolGetterNames = {};
            getterNames = {};
            setterNames = {};

            return declare([], {

                /**
                 * The public JSAdapter proxy for this instance
                 * 
                 * @instance
                 * @type {object}
                 */
                '--proxy' : null,

                /**
                 * The configuration property to enable proxy support, causing this instance to be exposed via a JSAdapter proxy
                 * 
                 * @instance
                 * @type {boolean}
                 * @default false
                 */
                '--proxy-support-enabled' : false,

                '--proxy-no-such-property-stack' : null,

                '--proxy-no-such-property-fallback-to-__get__' : false,

                '--proxy-getter-redirection-enabled' : false,

                '--proxy-virtual-getters-enabled' : false,

                '--proxy-virtual-getter-fallback-to-__get__' : false,

                '--proxy-use-getter-only' : false,

                '--proxy-setter-redirection-enabled' : false,

                '--proxy-virtual-setters-enabled' : false,

                '--proxy-virtual-setter-fallback-to-__put__' : false,

                '--proxy-use-setter-only' : false,

                classConstructor : function ProxySupport__classConstructor()
                {
                    var specificAdaptee, result = this, _this = this;

                    Object.defineProperty(this, noSuchPropertyStackKey, {
                        value : []
                    });

                    if (this[proxyEnabledKey] === true)
                    {
                        specificAdaptee = {};
                        adapteeFunctionNames.forEach(function ProxySupport__constructor_forAdapteeFunctionName(key)
                        {
                            specificAdaptee[key] = Function.prototype.bind.call(_this[key], _this);
                        });
                        result = new JSAdapter(this, {}, specificAdaptee);

                        Object.defineProperty(this, '--proxy', {
                            value : result
                        });
                    }

                    return result;
                },

                __noSuchProperty__ : function ProxySupport__noSuchProperty__(name)
                {
                    var result, getterName, suffix, prop;

                    if (typeof name !== 'string')
                    {
                        prop = String(name);
                    }
                    else
                    {
                        prop = name;
                    }

                    // don't handle our special properties
                    if (prop.startsWith('--proxy'))
                    {
                        // TODO File improvement: need to be caller-'use strict' aware
                        // TODO File improvement: simple way to raise ReferenceError identical to default __noSuchProperty__
                        result = undefined;
                    }
                    else if (this[proxyEnabledKey] === true)
                    {
                        if (this['--proxy-getter-redirection-enabled'] === true)
                        {
                            if (this[noSuchPropertyStackKey].indexOf(prop) === -1)
                            {
                                this[noSuchPropertyStackKey].push(prop);
                                try
                                {
                                    getterName = getterNames[prop];
                                    if (getterName === undefined)
                                    {
                                        suffix = prop.substring(0, 1).toUpperCase(Locale.ENGLISH) + prop.substring(1);
                                        getterName = getterNames[prop] = ('get' + suffix);
                                    }

                                    if (getterName in this && typeof this[getterName] === 'function')
                                    {
                                        logger.trace('Simulating property {} via getter {} in class {}', prop, getterName,
                                                this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className
                                                        : '<unknown>');
                                        result = this[getterName]();
                                    }
                                    else
                                    {
                                        getterName = boolGetterNames[prop];
                                        if (getterName === undefined)
                                        {
                                            suffix = suffix || (prop.substring(0, 1).toUpperCase(Locale.ENGLISH) + prop.substring(1));
                                            getterName = boolGetterNames[prop] = ('is' + suffix);
                                        }

                                        if (getterName in this && typeof this[getterName] === 'function')
                                        {
                                            logger.trace('Simulating property {} via getter {} in class {}', prop, getterName,
                                                    this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className
                                                            : '<unknown>');
                                            result = this[getterName]();
                                        }
                                        else
                                        {
                                            logger.trace('Found no getter for {}', prop);
                                            // TODO File improvement: need to be caller-'use strict' aware
                                            // TODO File improvement: simple way to raise ReferenceError identical to default
                                            // __noSuchProperty__
                                            result = undefined;
                                        }
                                    }
                                    this[noSuchPropertyStackKey].pop();
                                }
                                catch (e)
                                {
                                    this[noSuchPropertyStackKey].pop();
                                    logger.debug('Error simulating getter for {}: {}', prop, e.message);
                                    throw e;
                                }
                            }
                            else
                            {
                                logger.trace('Already in a __noSuchProperty__ call for property {} in class {}', prop,
                                        this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className
                                                : '<unknown>');
                                // TODO File improvement: need to be caller-'use strict' aware
                                // TODO File improvement: simple way to raise ReferenceError identical to default __noSuchProperty__
                                result = undefined;
                            }
                        }
                        else if (this['--proxy-no-such-property-fallback-to-__get__'] === true)
                        {
                            if (this[noSuchPropertyStackKey].indexOf(prop) === -1)
                            {
                                this[noSuchPropertyStackKey].push(prop);
                                try
                                {
                                    result = this.__get__(name, true);
                                    this[noSuchPropertyStackKey].pop();
                                }
                                catch (e)
                                {
                                    this[noSuchPropertyStackKey].pop();
                                    logger.debug('Error simulating property {} via __get__: {}', prop, e.message);
                                    throw e;
                                }
                            }
                            else
                            {
                                logger.trace('Already in a __noSuchProperty__ call for property {} in class {}', prop,
                                        this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className
                                                : '<unknown>');
                                // TODO File improvement: need to be caller-'use strict' aware
                                // TODO File improvement: simple way to raise ReferenceError identical to default __noSuchProperty__
                                result = undefined;
                            }
                        }
                        else
                        {
                            logger.trace('Not configured to simulate property {} via getter in class {}', prop,
                                    this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className : '<unknown>');
                            // TODO File improvement: need to be caller-'use strict' aware
                            // TODO File improvement: simple way to raise ReferenceError identical to default __noSuchProperty__
                            result = undefined;
                        }
                    }
                    else
                    {
                        logger.trace('Not configured to simulate property {} via getter in class {}', prop,
                                this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className : '<unknown>');
                        // TODO File improvement: need to be caller-'use strict' aware
                        // TODO File improvement: simple way to raise ReferenceError identical to default __noSuchProperty__
                        result = undefined;
                    }

                    if (result === this)
                    {
                        result = this['--proxy'];
                    }

                    return result;
                },

                __get__ : function ProxySupport__get__(name, __noSuchProperty__call)
                {
                    var result, getterName, suffix, prop, _this;

                    if (this['--proxy-use-getter-only'] !== true && __noSuchProperty__call !== true)
                    {
                        // either exists or handled by __noSuchProperty__
                        // TODO File improvement: need to suppress our 'use strict' for __noSuchProperty__ (catch ReferenceError)
                        // TODO File improvement: need to be caller-'use strict' aware
                        // TODO File improvement: simple way to raise ReferenceError identical to default __noSuchProperty__
                        result = this[name];
                    }
                    else if (this['--proxy-getter-redirection-enabled'] === true)
                    {
                        if (typeof name !== 'string')
                        {
                            prop = String(name);
                        }
                        else
                        {
                            prop = name;
                        }

                        getterName = getterNames[prop];
                        if (getterName === undefined)
                        {
                            suffix = prop.substring(0, 1).toUpperCase(Locale.ENGLISH) + prop.substring(1);
                            getterName = getterNames[prop] = ('get' + suffix);
                        }

                        if (getterName in this && typeof this[getterName] === 'function')
                        {
                            logger.trace('Simulating property {} via getter {} in class {}', prop, getterName,
                                    this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className : '<unknown>');
                            result = this[getterName]();
                        }
                        else
                        {
                            getterName = boolGetterNames[prop];
                            if (getterName === undefined)
                            {
                                suffix = suffix || (prop.substring(0, 1).toUpperCase(Locale.ENGLISH) + prop.substring(1));
                                getterName = boolGetterNames[prop] = ('is' + suffix);
                            }

                            if (getterName in this && typeof this[getterName] === 'function')
                            {
                                logger.trace('Simulating property {} via getter {} in class {}', prop, getterName,
                                        this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className
                                                : '<unknown>');
                                result = this[getterName]();
                            }
                            else
                            {
                                logger.trace('Found no getter for property {} in class {}', prop,
                                        this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className
                                                : '<unknown>');
                                // TODO File improvement: need to be caller-'use strict' aware
                                // TODO File improvement: simple way to raise ReferenceError identical to default __noSuchProperty__
                                result = undefined;
                            }
                        }
                    }

                    // guard to handle __get__(name) + fn.call instead of __call__(name)
                    if (typeof result === 'function')
                    {
                        // must ensure proper scope
                        _this = this;
                        result = Function.prototype.bind.call(function ProxySupport__get__boundFunction(fn)
                        {
                            var fnResult;

                            if (this === _this['--proxy'] || this === undefined)
                            {
                                fnResult = fn.apply(_this, Array.prototype.slice(arguments, 1));
                            }
                            else
                            {
                                fnResult = fn.apply(this, Array.prototype.slice(arguments, 1));
                            }

                            return fnResult;
                        }, undefined, result);
                    }

                    if (result === this)
                    {
                        result = this['--proxy'];
                    }

                    return result;
                },

                __put__ : function ProxySupport__put__(name, value)
                {
                    var result, setterName, suffix, prop;

                    // setter always has precedence
                    if (this['--proxy-setter-redirection-enabled'] === true || this['--proxy-use-setter-only'] === true)
                    {
                        if (typeof name !== 'string')
                        {
                            prop = String(name);
                        }
                        else
                        {
                            prop = name;
                        }

                        setterName = setterNames[prop];
                        if (setterName === undefined)
                        {
                            suffix = prop.substring(0, 1).toUpperCase(Locale.ENGLISH) + prop.substring(1);
                            setterName = setterNames[prop] = ('set' + suffix);
                        }

                        if (setterName in this && typeof this[setterName] === 'function')
                        {
                            result = this[setterName](value);
                            logger.trace('Redirected property put {} to setter {} in class {} ', prop, setterName,
                                    this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className : '<unknown>');
                        }
                        else if (this['--proxy-use-setter-only'] !== true)
                        {
                            this[name] = value;
                            result = value;
                        }
                        else
                        {
                            logger.trace('Can\'t execute property put for {} in class {} as --proxy-use-setter-only is set', prop,
                                    this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className : '<unknown>');
                        }
                    }
                    else
                    {
                        this[name] = value;
                        result = value;
                    }

                    return result;
                },

                __has__ : function ProxySupport__has__(name)
                {
                    var result = false, prop, getterName, suffix;

                    if (this['--proxy-use-getter-only'] !== true)
                    {
                        result = name in this;
                    }

                    if (!result && this['--proxy-getter-redirection-enabled'] === true)
                    {
                        if (typeof name !== 'string')
                        {
                            prop = String(name);
                        }
                        else
                        {
                            prop = name;
                        }

                        getterName = getterNames[prop];
                        if (getterName === undefined)
                        {
                            suffix = prop.substring(0, 1).toUpperCase(Locale.ENGLISH) + prop.substring(1);
                            getterName = getterNames[prop] = ('get' + suffix);
                        }

                        if (getterName in this && typeof this[getterName] === 'function')
                        {
                            logger.trace('Simulating property {} existence via getter {} in class {}', prop, getterName,
                                    this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className : '<unknown>');
                            result = true;
                        }
                        else
                        {
                            getterName = boolGetterNames[prop];
                            if (getterName === undefined)
                            {
                                suffix = suffix || (prop.substring(0, 1).toUpperCase(Locale.ENGLISH) + prop.substring(1));
                                getterName = boolGetterNames[prop] = ('is' + suffix);
                            }

                            if (getterName in this && typeof this[getterName] === 'function')
                            {
                                logger.trace('Simulating property {} existence via getter {} in class {}', prop, getterName,
                                        this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className
                                                : '<unknown>');
                                result = true;
                            }
                            else
                            {
                                logger.trace('Found no getter to simulate existence of property {} in class {}', prop,
                                        this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className
                                                : '<unknown>');
                            }
                        }
                    }

                    return result;
                },

                // __getIds__ is identical to __getKeys__ (JDK 6 compatibility)
                __getIds__ : function ProxySupport__getIds__()
                {
                    var result;

                    result = this.__getKeys__();

                    return result;
                },

                __getKeys__ : function ProxySupport__getKeys__()
                {
                    /* jshint forin: false */
                    var result, name, getterRedirectionEnabled, onlyGettersEnabled;

                    getterRedirectionEnabled = this['--proxy-getter-redirection-enabled'] === true;
                    onlyGettersEnabled = this['--proxy-use-getter-only'] === true;

                    result = [];
                    for (name in this)
                    {
                        if (typeof this[name] !== 'function')
                        {
                            if (onlyGettersEnabled !== true && publicPropertyPattern.test(name))
                            {
                                result.push(name);
                            }
                        }
                        else if (getterRedirectionEnabled === true && getterPattern.test(name))
                        {
                            name = name.startsWith('get') ? name.substring(3) : name.substring(2);
                            result.push(name);
                        }
                    }

                    return result;
                },

                __getValues__ : function ProxySupport__getValues__()
                {
                    var result, name, getterRedirectionEnabled, onlyGettersEnabled;

                    getterRedirectionEnabled = this['--proxy-getter-redirection-enabled'] === true;
                    onlyGettersEnabled = this['--proxy-use-getter-only'] === true;

                    result = [];
                    for (name in this)
                    {
                        if (typeof this[name] !== 'function')
                        {
                            if (onlyGettersEnabled !== true && publicPropertyPattern.test(name))
                            {
                                result.push(this[name]);
                            }
                        }
                        else if (getterRedirectionEnabled === true && getterPattern.test(name))
                        {
                            result.push(this[name]());
                        }
                    }

                    return result;
                },

                __delete__ : function ProxySupport__delete__(name)
                {
                    var result = false;

                    if (name in this)
                    {
                        result = delete this[name];
                    }

                    return result;
                },

                __call__ : function ProxySupport__call__(name)
                {
                    var result, fn, propName;

                    fn = name in this ? this[name] : undefined;

                    if (typeof fn !== 'function')
                    {
                        if (arguments.length === 1 && this['--proxy-virtual-getters-enabled'] === true
                                && (name.indexOf('get') === 0 || name.indexOf('is') === 0))
                        {
                            if (name.indexOf('get') === 0)
                            {
                                propName = name.substring(3);
                            }
                            else
                            {
                                propName = name.substring(2);
                            }

                            propName = propName.substring(0, 1).toLowerCase(Locale.ENGLISH) + propName.substring(1);

                            // needs to be enumerable
                            if (propName in this)
                            {
                                result = this[propName];
                                fn = null;
                                logger.trace('Simulated virtual getter {} for {} in class {} via direct access', name, propName,
                                        this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className
                                                : '<unknown>');
                            }
                            else if (this['--proxy-virtual-getter-fallback-to-__get__'] === true)
                            {
                                result = this.__get__(propName);
                                fn = null;
                                logger.trace('Simulated virtual getter {} for {} in class {} via __get__', name, propName,
                                        this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className
                                                : '<unknown>');
                            }
                        }
                        else if (arguments.length === 2 && this['--proxy-virtual-setters-enabled'] === true && name.indexOf('set') === 0)
                        {
                            propName = name.substring(3);
                            propName = propName.substring(0, 1).toLowerCase(Locale.ENGLISH) + propName.substring(1);

                            // needs to be enumerable
                            if (propName in this)
                            {
                                this[propName] = arguments[1];
                                fn = null;
                                result = arguments[1];
                                logger.trace('Simulated virtual setter {} for {} in class {} via direct store', name, propName,
                                        this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className
                                                : '<unknown>');
                            }
                            else if (this['--proxy-virtual-setter-fallback-to-__put__'] === true)
                            {
                                result = this.__put__(propName, arguments[1]);
                                fn = null;
                                logger.trace('Simulated virtual setter {} for {} in class {} via __put__', name, propName,
                                        this.constructor._declare_meta !== undefined ? this.constructor._declare_meta.className
                                                : '<unknown>');
                            }
                        }
                        // TODO Handle potential call to fn accessible via getter-redirection (if enabled)
                    }

                    if (typeof fn === 'function')
                    {
                        result = fn.apply(this, Array.prototype.slice.call(arguments, 2));
                    }
                    else if (result === undefined && fn === undefined)
                    {
                        // TODO Throw error about fn not existing
                    }

                    if (result === this)
                    {
                        result = this['--proxy'];
                    }

                    return result;
                },

                __new__ : function ProxySupport__new__()
                {
                    var result, BoundCtor;

                    if (typeof this === 'function')
                    {
                        BoundCtor = Function.prototype.bind.apply(this, [ undefined ].concat(Array.prototype.slice(arguments, 1)));
                        result = new BoundCtor();
                    }

                    return result;
                }
            });
        });