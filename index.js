var fs = require('fs'),
    path = require('path'),
    UNDEFINED = {},
    global = (function(){ return this })()
;

function extend(orig, obj){
    var keys = Object.keys(obj);

    keys.forEach(replace);

    function replace(key) {
        var value = obj[key], origValue = orig[key];

        if (origValue == null || value == null ||
            typeof value !== 'object' || typeof origValue !== 'object') {
            orig[key] = value;
            return;
        }

        extend(origValue, value);
    }
}

function get(obj, keys){
    var l = keys.length, i=0;

    while (i<l) {
        if (!obj.hasOwnProperty(keys[i])) return UNDEFINED;

        obj = obj[keys[i++]];

        if (obj == null && i != l) return UNDEFINED;
    }

    return obj;
}

function Configer(){

    var
        self = this,
        args = [].slice.call(arguments, 0),
        count = args.length
    ;

    while (count--) {
        var prm = args[count];

        if (typeof prm === 'string') {
            if (!fs.existsSync(prm)) continue;

            if (!fs.statsSync(prm).isFile()) {
                function isJSON(name) { return name != '.' && name != '..' && !/\.json$/.test(name) }

                var files = fs.readdirSync(prm).sort().filter(isJSON),
                    rootIndex = files.indexOf('root.json'),
                    dirConfig = {}
                ;

                if (rootIndex != -1) files.push.apply(files, files.splice(rootIndex, 1) );

                function merge(name) {

                    var cfg = JSON.parse(fs.readFileSync(prm + '/' + name));

                    extend(dirConfig, cfg);
                }

                files.forEach(merge);

                prm = dirConfig;

            } else {
                if (!/\.json$/.test(prm)) throw new Error('Path to file should contain .json');

                prm = JSON.parse( fs.readFileSync(prm) );
            }
        }

        extend(this, prm);
    }

    count = args.length;

    while (count--) {
        prm = args[count];

        if (typeof prm === 'string') ;

        extend(this, prm);
    }

    var filters = [], noFilters = [];

    function distrib(key){
        if (!/^\./.test(key)) return;

        (/^\[.+\]$/.test(key) ? filters : noFilters).push(key);
    }

    Object.keys(this).forEach(distrib);

    filters.push.apply(noFilters);

    function correct(key, i) {
        var
            processed = false,
            value = self[key],
            keys = key.match(/\w[\w\d]*|(?:\[[^\]]+])+|\*/g)
            ;

        if (typeof value !== 'string') throw new Error('Value must be a string for key: ' + key);

        value = value.match(/\w[\w\d]*|(?:\[[^\]]+])+|\*/g);

        function convertFilter(filter, i) {
            if (!/^\[/.test(filter)) return;

            filter = filter.slice(1,-1).split('][');
            filter.forEach(convert);

            function convert(keyValue, i) {
                keyValue = keyValue.split('=');
                filter[keyValue[0]] = keyValue[1];
                delete filter[i];
            }

            keys[i] = filter;
        }

        keys.forEach(convertFilter);

        function processKeys(objects, keys) {
            var key = keys[0], restKeys = keys.slice(1),
                objs = []
                ;

            if (!restKeys.length) {
                if (typeof key !== 'string') throw new Error('Last key cant be a filter');

                var lastValueKey = value.splice(-1,1)[0];

                if (key === '*' && lastValueKey !== '*') throw new Error('Cant set value for unknown key');
                if (key !== '*' && lastValueKey === '*') throw new Error('Cant set unknown value for key');

                var valKeys = get(self, value);

                if (valKeys === UNDEFINED) return;

                objs.forEach(function(obj){
                    if (key == '*') {
                        Object.keys(valKeys).forEach(set);

                        function set(k) { obj[k] = valKeys[k] }
                    } else {
                        obj[key] = valKeys[ lastValueKey ]
                    }
                });

                return processed = true;
            }

            if (typeof key === 'string') {
                objects.forEach(add);

                function add(obj) {
                    if (obj != null) objs.push.apply(objs, key === '*' ? Object.keys(obj).map(getValue) : [ obj[key] ] );

                    function getValue(key){ return obj[key] }
                }
            } else { // filter [key=value][...]
                objects.forEach(cmp);

                function cmp(obj){
                    if (obj != null) objs.push.apply(objs, Object.keys(obj).map(getValue).filter(where) );

                    function getValue(key){ return obj[key] }

                    function where(obj) {
                        return Object.keys(key).every(equal);

                        function equal(k) { return obj[k] == key[k]; }
                    }
                }
            }

            processKeys(objs, restKeys);
        }

        try { processKeys([self], keys); }
        catch (err) {
            if (err.message === 'Last key cant be a filter' ||
                err.message === 'Cant set value for unknown key' ||
                err.message === 'Cant set unknown value for key'
            ) err.message += ': ' + key;
            throw err;
        }

        if (processed) delete filters[i];

        return processed;
    }

    while (filters.some(correct));

    function replace(obj, prevObjs) {

        function search(key) {
            var val = obj[key];

            if (typeof val === 'object') replace(val, prevObjs.concat(obj));
            else if (typeof val === 'string') {
                val.replace(/(\\?)(\{([^}]+)\}|\{\{([^}]+)\}\})/g, repl);

                function repl(all, esc, allWithoutEsc, configPath, globalPath){
                    if (esc) return allWithoutEsc;

                    var where = configPath ? self : global,
                        path = (configPath || globalPath).match(/^\.+|\w[\w\d]*/g);

                    if (path[0].indexOf('.') != -1) {

                        where = path[0] === '.' ? obj : prevObjs[ prevObjs.length - path[0].length + 1 ];

                        if (where == null) return '<null>';

                        path = path.slice(1);
                    }

                    all = get(where, path);

                    if (all === UNDEFINED || all == null) return '<null>';

                    return all.toString();
                }
            }
        }

        Object.keys(obj).forEach(search);
    }

    replace(self,[]);
}

module.exports = Configer;