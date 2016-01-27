/* globals -require */
define(
        [ './c3mro', './logger', 'nashorn!Java', 'nashorn!JSAdapter' ],
        function declare(c3mro, logger, Java, JSAdapter)
        {
            'use strict';
            var anonClassCount = 0, FnCtor, DummyCtor, Locale, declareNoSuchPropertyStackKey, declareNoSuchPropertyImpl, declareAdaptee, getterNames, boolGetterNames, setterNames, isObject, fn_toString, isInstanceOf, inherited, forceNew, applyNew, standardConstructor, taggedMixin, standardPrototype, declareImpl, declareFn;

            FnCtor = Function;

            DummyCtor = new FnCtor();

            Locale = Java.type('java.util.Locale');

            declareNoSuchPropertyStackKey = '--declare--no-such-property-stack';
            declareNoSuchPropertyImpl = function declare__noSuchProperty__(prop)
            {
                var result, getterName, suffix;

                // don't handle our special properties
                if (String(prop).startsWith('--'))
                {
                    result = false;
                }
                // this isn't actually part of the proxy but it delegates this feature here
                else if (this['--declare--proxy-support-enabled'] === true)
                {
                    if (this['--declare--proxy-getter-redirection-enabled'] === true)
                    {
                        if (this[declareNoSuchPropertyStackKey] === null)
                        {
                            this[declareNoSuchPropertyStackKey] = [];
                        }

                        if (this[declareNoSuchPropertyStackKey].indexOf(prop) === -1)
                        {
                            this[declareNoSuchPropertyStackKey].push(prop);
                            try
                            {
                                getterName = getterNames[prop];
                                if (getterName === undefined)
                                {
                                    suffix = prop.substring(0, 1).toUpperCase(Locale.ENGLISH) + prop.substring(1);
                                    getterName = getterNames[prop] = ('get' + suffix);
                                }

                                this[declareNoSuchPropertyStackKey].push(getterName);
                                if (typeof this[getterName] === 'function')
                                {
                                    this[declareNoSuchPropertyStackKey].pop();
                                    logger.trace('Simulating property {} via getter {} on {}', prop, getterName, this);
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

                                    this[declareNoSuchPropertyStackKey].push(getterName);
                                    if (typeof this[getterName] === 'function')
                                    {
                                        this[declareNoSuchPropertyStackKey].pop();
                                        logger.trace('Simulating property {} via getter {} on {}', prop, getterName, this);
                                        result = this[getterName]();
                                    }
                                    else
                                    {
                                        logger.trace('Found no getter for {}', prop);
                                    }
                                }

                                this[declareNoSuchPropertyStackKey].pop();
                            }
                            catch (e)
                            {
                                this[declareNoSuchPropertyStackKey].pop();
                                logger.debug('Error simulating getter for {}: {}', prop, e.message);
                                throw e;
                            }
                        }
                    }
                    else if (this['--declare--proxy-extension-hooks-enabled'] === true && typeof this.__get__ === 'function')
                    {
                        result = this.__get__(prop);
                    }
                    else
                    {
                        logger.trace('Not configured to simulate property {} via getter on {}', prop, this);
                    }
                }
                else
                {
                    logger.trace('Not configured to simulate property {} via getter on {}', prop, this);
                }

                return result;
            };

            // common adaptee for JSAdapter - every proxy instance will get
            // a __delegate override property to reference the actual instance
            declareAdaptee = {
                __get__ : function declare_adaptee__get__(prop)
                {
                    var result, getterName, suffix;

                    if (this.__delegate['--declare--proxy-use-getter-only'] !== true)
                    {
                        // either exists or handled by __noSuchProperty__ in delegate
                        result = this.__delegate[prop];
                    }
                    else
                    {
                        getterName = getterNames[prop];
                        if (getterName === undefined)
                        {
                            suffix = prop.substring(0, 1).toUpperCase(Locale.ENGLISH) + prop.substring(1);
                            getterName = getterNames[prop] = ('get' + suffix);
                        }

                        if (typeof this.__delegate[getterName] === 'function')
                        {
                            logger.trace('Simulating property {} via getter {} on {}', prop, getterName, this.__delegate);
                            result = this.__delegate[getterName]();
                        }
                        else
                        {
                            getterName = boolGetterNames[prop];
                            if (getterName === undefined)
                            {
                                suffix = suffix || (prop.substring(0, 1).toUpperCase(Locale.ENGLISH) + prop.substring(1));
                                getterName = boolGetterNames[prop] = ('is' + suffix);
                            }

                            if (typeof this.__delegate[getterName] === 'function')
                            {
                                logger.trace('Simulating property {} via getter {} on {}', prop, getterName, this.__delegate);
                                result = this.__delegate[getterName]();
                            }
                            else if (this.__delegate['--declare--proxy-extension-hooks-enabled'] === true
                                    && typeof this.__delegate.__get__ === 'function')
                            {
                                result = this.__delegate.__get__(prop);
                            }
                            else
                            {
                                logger.trace('Found no getter for property {} on {}', prop, this.__delegate);
                            }
                        }
                    }

                    return result;
                },

                __put__ : function declare_adaptee__put__(prop, value)
                {
                    var result, setterName, suffix;

                    // setter always has precedence
                    if (this.__delegate['--declare--proxy-setter-redirection-enabled'] === true
                            || this.__delegate['--declare--proxy-use-setter-only'] === true)
                    {
                        setterName = setterNames[prop];
                        if (setterName === undefined)
                        {
                            suffix = prop.substring(0, 1).toUpperCase(Locale.ENGLISH) + prop.substring(1);
                            setterName = setterNames[prop] = ('set' + suffix);
                        }

                        if (typeof this.__delegate[setterName] === 'function')
                        {
                            result = this.__delegate[setterName](value);
                            logger.trace('Redirected property put {} to setter {} on {} ', prop, setterName, this.__delegate);
                        }
                        else if (this.__delegate['--declare--proxy-use-setter-only'] !== true)
                        {
                            if (prop in this.__delegate || this.__delegate['--declare--proxy-extension-hooks-enabled'] !== true
                                    || typeof this.__delegate.__put__ !== 'function')
                            {
                                this.__delegate[prop] = value;
                                result = value;
                            }
                            else
                            {
                                result = this.__delegate.__put__(prop, value);
                            }
                        }
                        else if (this.__delegate['--declare--proxy-extension-hooks-enabled'] === true
                                && typeof this.__delegate.__put__ === 'function')
                        {
                            result = this.__delegate.__put__(prop, value);
                        }
                        else
                        {
                            logger.trace('Can\'t execute property put {} on {} as --declare--proxy-use-setter-only is set', prop,
                                    this.__delegate);
                        }
                    }
                    else if (this.__delegate['--declare--proxy-extension-hooks-enabled'] === true
                            && typeof this.__delegate.__put__ === 'function')
                    {
                        result = this.__delegate.__put__(prop, value);
                    }
                    else
                    {
                        this.__delegate[prop] = value;
                        result = value;
                    }

                    return result;
                },

                __call__ : function declare_adaptee__call__(name)
                {
                    var result, fn, propName;

                    fn = this.__delegate[name];

                    if (typeof fn !== 'function')
                    {
                        if (arguments.length === 1 && this.__delegate['--declare--proxy-virtual-getters-enabled'] === true
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
                            if (propName in this.__delegate)
                            {
                                try
                                {
                                    result = this.__delegate[propName];
                                    fn = null;
                                    logger.trace('Simulated virtual getter {} for {} on {}', name, propName, this.__delegate);
                                }
                                catch (e1)
                                {
                                    logger.debug('Error simulating virtual getter {} for {} on {}: {}', name, propName, this.__delegate,
                                            e1.message);
                                }
                            }
                        }
                        else if (arguments.length === 2 && this.__delegate['--declare--proxy-virtual-setters-enabled'] === true
                                && name.indexOf('set') === 0)
                        {
                            propName = name.substring(3);
                            propName = propName.substring(0, 1).toLowerCase(Locale.ENGLISH) + propName.substring(1);

                            // needs to be enumerable
                            if (propName in this.__delegate)
                            {
                                try
                                {
                                    this.__delegate[propName] = arguments[1];
                                    fn = null;
                                    result = arguments[1];
                                    logger.trace('Simulated virtual setter {} for {} on {}', name, propName, this.__delegate);
                                }
                                catch (e2)
                                {
                                    logger.debug('Error simulating virtual setter {} for {} on {}: {}', name, propName, this.__delegate,
                                            e2.message);
                                }
                            }
                        }
                    }

                    if (typeof fn === 'function')
                    {
                        result = fn.apply(this.__delegate, Array.prototype.slice.call(arguments, 1));
                    }
                    else if (fn !== null && this.__delegate['--declare--proxy-extension-hooks-enabled'] === true
                            && typeof this.__delegate.__call__ === 'function')
                    {
                        result = this.__delegate.__call__.apply(this.__delegate, Array.prototype.slice.call(arguments, 0));
                    }

                    return result;
                },

                __getIds__ : function declare_adaptee__getIds__()
                {
                    var result;

                    if (this.__delegate['--declare--proxy-extension-hooks-enabled'] === true
                            && typeof this.__delegate.__getIds__ === 'function')
                    {
                        result = this.__delegate.__getIds__();
                    }
                    else
                    {
                        result = Object.keys(this.__delegate);
                    }

                    return result;
                }

            // TODO add other adaptee fns
            };

            getterNames = {};
            boolGetterNames = {};
            setterNames = {};

            isObject = function declare__isObject(o)
            {
                var result = o instanceof Object && Object.prototype.toString.call(o) === '[object Object]';
                return result;
            };

            fn_toString = function declare__fn_toString(defaultToString)
            {
                var result, className, fnName;

                if (defaultToString === true)
                {
                    result = Function.prototype.toString.call(this);
                }
                else
                {
                    if (this._declare_meta !== undefined)
                    {
                        className = this._declare_meta.className;
                    }
                    else
                    {
                        className = this.fnClsName;
                    }
                    fnName = this.fnName;

                    result = '[Function ' + className + '_' + fnName + ']';
                }

                return result;
            };

            isInstanceOf = function declare__isInstanceOf(cls)
            {
                var linearization = this.constructor._c3mro_linearization, isBase = false, idx;

                for (idx = 0; idx < linearization.length && isBase === false; idx++)
                {
                    isBase = linearization[idx] === cls;
                }

                return isBase;
            };

            inherited = function declare__inherited()
            {
                var result, fnName, fnClsName, callerFn, args, overrides, effectiveArgs, idx, lastLookup, ctor, proto, fn, clsFound;

                // due to 'use strict' we can't use args.callee and have to require named function reference being passed

                for (idx = 0; idx < arguments.length; idx++)
                {
                    if (idx === 0 && typeof arguments[idx] === 'string')
                    {
                        fnName = arguments[idx];
                        fnClsName = this.constructor._declare_meta.className;
                    }
                    else if (idx === 0 && typeof arguments[idx] === 'function')
                    {
                        callerFn = arguments[idx];
                        if (typeof callerFn.fnName === 'string')
                        {
                            fnName = callerFn.fnName;
                            fnClsName = callerFn.fnClsName;
                        }
                    }
                    else if (idx < 2 && args === undefined)
                    {
                        args = arguments[idx];
                    }
                    else if (idx > 1 && args !== undefined && overrides === undefined && Array.isArray(arguments[idx]))
                    {
                        overrides = arguments[idx];
                    }
                }

                if (fnName === undefined)
                {
                    throw new Error('Unable to determine function name to call for inherited()');
                }

                if (fnName !== 'constructor')
                {
                    if (overrides !== undefined)
                    {
                        for (idx = 0; idx < args.length || idx < overrides.length; idx++)
                        {
                            if (idx < overrides.length)
                            {
                                effectiveArgs.push(overrides[idx]);
                            }
                            else
                            {
                                effectiveArgs.push(args[idx]);
                            }
                        }
                    }
                    else
                    {
                        effectiveArgs = args;
                    }

                    if (this._inherited !== undefined)
                    {
                        lastLookup = this._inherited;
                    }
                    else
                    {
                        lastLookup = {
                            callerFnName : null,
                            callerFnClsName : null,
                            ctor : null
                        };

                        Object.defineProperty(this, '_inherited', {
                            value : lastLookup
                        });
                    }

                    if (lastLookup.callerFnName === fnName && lastLookup.callerFnClsName === fnClsName)
                    {
                        ctor = lastLookup.ctor;
                    }
                    else
                    {
                        ctor = this.constructor;
                    }
                    proto = ctor.prototype;

                    // ascend the proto chain
                    while (fn === undefined && ctor !== null)
                    {
                        if (clsFound === true)
                        {
                            if (proto.hasOwnProperty(fnName) && typeof proto[fnName] === 'function')
                            {
                                fn = proto[fnName];
                            }
                        }
                        else
                        {
                            clsFound = ctor.fnClsName === fnClsName;
                        }

                        if (typeof ctor.superClass === 'function')
                        {
                            ctor = ctor.superClass;
                            proto = ctor.prototype;
                        }
                        else
                        {
                            ctor = null;
                        }
                    }

                    lastLookup.callerFnName = fnName;
                    lastLookup.callerFnClsName = fnClsName;
                    lastLookup.ctor = ctor;

                    if (fn !== undefined)
                    {
                        result = fn.apply(this, effectiveArgs);
                    }
                }
                else
                {
                    throw new Error('constructor is inheritently chained - call to inherited() is invalid');
                }

                return result;
            };

            forceNew = function declare__forceNew(ctor)
            {
                var instance;

                DummyCtor.prototype = ctor.prototype;
                instance = new DummyCtor();
                DummyCtor.prototype = null;

                return instance;
            };

            applyNew = function declare__applyNew(args, ctor)
            {
                var instance = forceNew(ctor);
                ctor.apply(instance, args);
                return instance;
            };

            standardConstructor = function declare__createStandardConstructor()
            {
                var standardCtor = function declare__standardConstructor()
                {
                    var result, idx, ctor, linearization;

                    if (!(this instanceof standardCtor))
                    {
                        result = applyNew(arguments, standardCtor);
                    }
                    else
                    {
                        linearization = standardCtor._c3mro_linearization;
                        result = this;

                        for (idx = linearization.length - 1; idx >= 0; idx--)
                        {
                            ctor = linearization[idx]._declare_meta.constructor;
                            if (typeof ctor === 'function')
                            {
                                ctor.apply(result, arguments);
                            }
                        }

                        // class name is included in a non-enumerable field to avoid messing with potential JSON.stringify use
                        Object.defineProperty(result, '_declare_className', {
                            value : standardCtor._declare_meta.className
                        });
                    }

                    if (result['--declare--proxy-support-enabled'] === true)
                    {
                        // any of these trigger JSAdapter - otherwise __noSuchProperty__ is enough
                        if (result['--declare--proxy-virtual-getters-enabled'] === true
                                || result['--declare--proxy-virtual-setters-enabled'] === true
                                || result['--declare--proxy-use-getter-only'] === true
                                || result['--declare--proxy-use-setter-only'] === true
                                || result['--declare--proxy-setter-redirection-enabled'] === true
                                || result['--declare--proxy-extension-hooks-enabled'] === true)
                        {
                            result = new JSAdapter(result, {
                                __delegate : result
                            }, declareAdaptee);
                        }
                    }

                    return result;
                };

                return standardCtor;
            };

            taggedMixin = function declare__taggedMixin(target, source)
            {
                var name, value;

                for (name in source)
                {
                    if (source.hasOwnProperty(name) && name !== 'constructor')
                    {
                        value = source[name];
                        if (typeof value === 'function')
                        {
                            value.fnName = name;
                            value.toString = fn_toString;

                            if (target.constructor._declare_meta !== undefined)
                            {
                                value.fnClsName = target.constructor._declare_meta.className;
                            }
                        }
                        target[name] = value;
                    }
                }
            };

            standardPrototype = function declare__standardPrototype(cls, classStructure)
            {
                var superClass, proto, ctor, superLin, slLen, clsLin, clLen, startWithSuperClass = true, base, offset, name;

                superClass = cls._declare_meta.superClass;

                if (superClass !== null)
                {
                    // Check if expected superClass (first in superClass arg to declare) matches linearization tail
                    // If yes, use superClass for initial proto and mixin proto properties of all cls in linearization from superClass
                    // to 1
                    // If no, construct completely new chain of protos based on linearization

                    clsLin = cls._c3mro_linearization;
                    clLen = clsLin.length;

                    superLin = superClass._c3mro_linearization;
                    slLen = superLin.length;

                    for (offset = 1; offset <= slLen; offset++)
                    {
                        if (superLin[slLen - offset] !== clsLin[clLen - offset])
                        {
                            startWithSuperClass = false;
                        }
                    }

                    if (startWithSuperClass === false)
                    {
                        // can't use superClass as start, so reset offset and select differnt superClass to start proto from
                        superClass = clsLin[clLen - 1];
                        offset = 2;
                    }

                    while (offset < clLen)
                    {
                        proto = forceNew(superClass);

                        base = clsLin[clLen - offset];

                        for (name in base.prototype)
                        {
                            if (base.prototype.hasOwnProperty(name))
                            {
                                if (name !== 'constructor')
                                {
                                    proto[name] = base.prototype[name];
                                }
                            }
                        }

                        ctor = new FnCtor();
                        ctor.superClass = superClass;
                        ctor.prototype = proto;
                        ctor.fnClsName = base._declare_meta.className + '-derived';
                        ctor.fnName = 'constructor';
                        ctor.toString = fn_toString;
                        proto.constructor = ctor;

                        Object.freeze(ctor);

                        superClass = ctor;

                        offset += 1;
                    }

                    // last base => our (empty) proto
                    proto = forceNew(superClass);
                }
                else
                {
                    proto = {};
                    // base of class hierarchy so add the __noSuchProperty__ handling stuff
                    proto.__noSuchProperty__ = declareNoSuchPropertyImpl;
                    proto[declareNoSuchPropertyStackKey] = null;
                }

                cls.prototype = proto;
                proto.constructor = cls;
                proto.declaredClass = cls._declare_meta.className;
                cls.superClass = superClass || null;
                cls.fnClsName = cls._declare_meta.className;
                cls.fnName = 'constructor';

                taggedMixin(proto, classStructure);

                return proto;
            };

            declareImpl = function declare__declareImpl(className, superClass, bases, classStructure)
            {
                var ctor, proto, meta, structure;

                ctor = standardConstructor();

                // flip bases into order "right most mixin -> left most mixin -> superClass"
                // ensures linearization results in correct override order for mixins over base class
                bases.reverse();
                c3mro(ctor, bases);
                // flip back for documentation in meta
                bases.reverse();

                structure = {};

                Object.keys(classStructure).forEach(function declare__declareImpl_forEach_classStructure(key)
                {
                    if (key !== 'constructor')
                    {
                        structure[key] = classStructure[key];
                    }
                });

                meta = {
                    className : className,
                    superClass : superClass || null,
                    constructor : classStructure.constructor || null,
                    structure : structure,
                    bases : bases
                };

                Object.defineProperty(ctor, '_declare_meta', {
                    value : meta
                });

                proto = standardPrototype(ctor, classStructure);

                // MAYBE Add special functions (extend / createSubclass) to ctor (if we need to support them)

                proto.isInstanceOf = isInstanceOf;
                proto.inherited = inherited;
                ctor.toString = fn_toString;
                // TODO Add 'standard' methods to proto

                Object.freeze(meta);
                Object.freeze(bases);
                Object.freeze(structure);

                return ctor;
            };

            declareFn = function declare__declare()
            {
                var className, bases, superClass, structure, idx, fArr, fIdx;

                for (idx = 0; idx < arguments.length; idx++)
                {
                    if (idx === 0 && typeof arguments[idx] === 'string')
                    {
                        className = arguments[idx];
                    }

                    if (idx < 2 && bases === undefined && structure === undefined && typeof arguments[idx] === 'function')
                    {
                        bases = [ arguments[idx] ];
                    }

                    if (idx < 2 && bases === undefined && structure === undefined && Array.isArray(arguments[idx]))
                    {
                        fArr = arguments[idx];

                        bases = [];
                        for (fIdx = 0; fIdx < fArr.length; fIdx++)
                        {
                            if (typeof fArr[fIdx] !== 'function')
                            {
                                throw new Error('Base ' + fArr[fIdx] + ' is not a callable constructor');
                            }

                            if (!isObject(fArr[fIdx]._declare_meta) || typeof fArr[fIdx]._declare_meta.className !== 'string')
                            {
                                throw new Error('Base ' + fArr[fIdx] + ' appears not to have been defined via declare');
                            }

                            bases.push(fArr[fIdx]);
                        }
                    }

                    if (idx < 3 && structure === undefined && isObject(arguments[idx]))
                    {
                        structure = arguments[idx];
                    }
                }

                if (structure === undefined || structure === null)
                {
                    structure = {};
                }

                if (bases === undefined)
                {
                    bases = [];
                }

                if (className === undefined || className === null)
                {
                    // TODO Try to derive name from calling module
                    className = 'anonClass_' + (++anonClassCount);
                }

                if (bases.length > 0)
                {
                    superClass = bases[0];
                }

                return declareImpl(className, superClass, bases, structure);
            };

            Object.freeze(declareFn);

            return declareFn;
        });