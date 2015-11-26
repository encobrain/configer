var fs = require('fs'),
    path = require('path')
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

    filters.forEach(correct);

    function correct(key) {
        var
            value = self[key].match(/\w[\w\d]*|(?:\[[^\]]+])+|\*/g),
            keys = key.match(/\w[\w\d]*|(?:\[[^\]]+])+|\*/g)
        ;

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

                if (key === '*' && value[value.length-1] !== '*') throw new Error('Cant set value for unknown key');
                if (key !== '*' && value[value.length-1] === '*') throw new Error('Cant set unknown value for key');

                //TODO: get value/s and set to objects;

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

        try {
            processKeys([self], keys);
        } catch (err) {
            if (err.message === 'Last key cant be a filter' ||
                err.message === 'Cant set value for unknown key' ||
                err.message === 'Cant set unknown value for key'
            ) err.message += ': ' + key;
            throw err;
        }

    }



}

module.exports = Configer;