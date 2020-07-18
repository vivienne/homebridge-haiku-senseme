# Homebridge Haiku by Big Ass Fans Plugin

A homebridge plugin for Haiku by BAF devices. Tested on Haiku Light only. 

Uses this modified version of the [haiku-senseme](https://github.com/vivienne/haiku-senseme) API.

## Installing

Install through homebridge-config-ui-x or manually:

```
sudo npm install -g homebridge-haiku-senseme 
```
Example config.json below:
```
    "platforms": [
        {
            "name": "Haiku by Big Ass Fans",
            "platform": "haiku"
        }
    ]
```

## Notes

* Tested on Haiku light only
* On startup, platform will run discovery for 10 seconds
* Skeleton accessory added for fans but is wholly untested. Ideally services would be added depending on their existence, but that level of JS is beyond me. PRs welcome. 