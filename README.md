Configer for create flexible config from objects, files and directories of files

Use:

var config = new Configer(Object | 'path/to/file/name.json' | 'path/to/directory/of/files'[, ...]);

Syntax:

    {
        ".prop.*": ".prop2.*", // if no property in "prop" then gets from "prop2"
        ".shape[color=red][...].border": ".figure.border", // search for elements. if no property  "prop.*.border" then gets from "figure.border" if "prop.*.color=red" 
        "text": "My id is",
        "id": "{{process.id}}" // get data from global 
        
        "prm": {
            "name": "{..text} {..id}" // gets data from branch up level 2
            "text": "My name is {.name}" // gets data from current branch
        },
        
        "question": "{prm.name}. Or not?" // get data from root branch
        "someInfo": "Text \{b} text \{/b}" // escape
    }

Example:

    {
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
                "sex": "female",
                
                "hairColor": "red"
            }
        ],
        
        "male": {
            "eyesColor": "blue",           
        },
        
        "female": {
            "eyesColor": "green"
        }
        
        ".people.*.*": ".homo.*",
        
        ".people[sex=male].*": ".male.*",
        ".people[sex=female].*": ".female.*"
        
        
    }
    
    config.people[0].hairColor === 'brown';
    config.people[1].hairColor === 'red';
    config.people[0].eyesColor === 'blue';
    config.people[1].eyesColor === 'green';
    

Priority of extending config
    
    1. From last to begin of params new()
    2. In each param if it path to directory then load files from long to short names and last is root.json
    3. On finish of merge do syntax analys
        3.1. extends with filter
        3.2. extends without filter

    
    
    
