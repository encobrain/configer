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

        if (origValue == null || value != null && typeof value != 'object') {
            orig[key] = value;
            return;
        }

        if (value != null) extend(origValue, value);
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

            if (!fs.statSync(prm).isFile()) {
                function isJSON(name) { return fs.statSync(prm+'/'+name).isFile() && /\.json$/.test(name) }

                var files = fs.readdirSync(prm).sort().filter(isJSON),
                    rootIndex = files.indexOf('root.json'),
                    dirConfig = {}
                    ;

                if (rootIndex != -1) files.push.apply(files, files.splice(rootIndex, 1) );

                function merge(name) {
                    var cfg = JSON.parse(fs.readFileSync(prm + '/' + name));

                    if (name !== 'root.json') {
                        var _ = dirConfig,
                            keys = name.match(/\w[^.]*/g).slice(0,-1),
                            last = keys.splice(-1,1)[0];

                        keys.forEach(get);

                        function get(key) { _ = _[key] || (_[key] = {}) }

                        _[last] = cfg;

                    } else extend(dirConfig, cfg);
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

    var filters = [], noFilters = [];

    function distrib(key){
        if (!/^\./.test(key)) return;

        (/\[/.test(key) ? filters : noFilters).push(key);
    }

    Object.keys(this).forEach(distrib);

    filters.push.apply(filters, noFilters);

    function correct(key) {
        var
            processed = false,
            value = self[key],
            keys = key.match(/\w[\w\d]*|(?:\[[^\]]+])+|\*/g)
            ;

        if (typeof value !== 'string') throw new Error('Value must be a string for key: ' + key);

        value = value.match(/\w[\w\d]*|\*/g);

        function convertFilter(filter, i) {
            if (!/^\[/.test(filter)) return;

            var obj = keys[i] = {}

            filter = filter.slice(1,-1).split('][');
            filter.forEach(convert);

            function convert(keyValue, i) {
                keyValue = keyValue.split('=');
                obj[keyValue[0]] = keyValue[1];
            }
        }

        keys.forEach(convertFilter);

        function processKeys(objects, keys) {
            var key = keys[0], restKeys = keys.slice(1),
                objs = []
                ;

            if (!restKeys.length) {
                if (typeof key !== 'string') throw new Error('Last key cant be a filter');

                var lastValueKey = value[value.length - 1];

                if (key === '*' && lastValueKey !== '*') throw new Error('Cant set value for unknown key');
                if (key !== '*' && lastValueKey === '*') throw new Error('Cant set unknown value for key');

                var valKeys = get(self, value.slice(0,-1));

                if (valKeys === UNDEFINED) return;

                objects.forEach(function(obj){
                    if (obj == null) return;

                    if (key == '*') {
                        Object.keys(valKeys).forEach(set);

                        function set(k) {
                            if (obj[k] == null && valKeys[k] != null) {
                                obj[k] = valKeys[k];
                                processed = true;
                            }
                        }
                    } else {
                        if (obj[key] == null && valKeys[ lastValueKey ] != null) {
                            obj[key] = valKeys[ lastValueKey ];
                            processed = true;
                        }
                    }
                });

                return;
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

        return processed;
    }

    var anyProcessed = true;

    while (anyProcessed) {
        anyProcessed = false;

        filters.forEach(process);

        function process(key){ anyProcessed = correct(key) || anyProcessed; }
    }

    function replace(obj, prevObjs) {

        function search(key) {
            var val = obj[key];

            if (typeof val === 'object') replace(val, prevObjs.concat(obj));
            else if (typeof val === 'string') {
                obj[key] = val.replace(/(\\?)(\{([\w\d.]*)}|\{\{(\w[\w\d.]*)}})/g, repl);

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

        if (obj != null) Object.keys(obj).forEach(search);
    }

    replace(self,[]);

    return this;
}

module.exports = Configer;