TEST = {GLOBAL: 'Test global value'};

var configData = {
    "homo": {
        "hairColor": "brown",
        "eyesColor": "gray"
    },

    "people": [
        {
            "name": "Alex",
            "sex": "male"
        },

        {
            "name": "Anna",
            "sex": "female"
        },

        {
            "name": "Nick"
        }
    ],

    "male": {
        "eyesColor": "blue"
    },

    "female": {
        "eyesColor": "green",
        "hairColor": "red"
    },

    ".people.*.*": ".homo.*",

    ".people[sex=male].*": ".male.*",
    ".people[sex=female].*": ".female.*",

    "title": "{{TEST.GLOBAL}}",

    "maleDefaultEyesColor": "{male.eyesColor}",

    "level1": {
        "level2": {
            "text": "{..text}"
        },

        "text": "Good work"
    }
}

var Configer = require('./index');
var config = new Configer(configData);

console.log(config.people[0].hairColor, '===', 'brown');
console.log(config.people[1].hairColor, '===', 'red');
console.log(config.people[2].hairColor, '===', 'brown');
console.log(config.people[0].eyesColor, '===', 'blue');
console.log(config.people[1].eyesColor, '===', 'green');

console.log(config.title, '===', TEST.GLOBAL);

console.log(config.maleDefaultEyesColor, '===', 'blue');

console.log(config.level1.level2.text, '===', 'Good work');

