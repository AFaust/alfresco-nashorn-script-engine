Object.defineProperty(this, 'scopeObj', {
    value : null,
    configurable : false,
    enumerable : false,
    writable : true
});

// would have liked to be able to "freeze" global, but then FILENAME seems to not be updateable