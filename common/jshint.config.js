{
    "bitwise": true,
    "curly": true,
    "eqeqeq": true,
    "forin": true,
    "freeze": true,
    "latedef": true,
    "undef": true,
    "noarg": true,
    "nonew": true,
    "strict" : true,
    "unused" : true,
    "laxbreak" : true,
    // really embarrassing - jshint Mojo searches "globals" via regex instead of proper evaluation
    // we'd prefer ' over " but whatever
    "globals": { 
        "define": false,
        "require" : false
    }
}