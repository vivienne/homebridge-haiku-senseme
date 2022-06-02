# DEPRECATED

Please try the [homebridge-i6-bigAssFans](https://github.com/oogje/homebridge-i6-bigAssFans) plugin instead which is being actively maintained and is compatbile with the new API.

<s>Homebridge Haiku by Big Ass Fans Plugin

A homebridge plugin for Haiku by BAF devices. This plugin has been made obsolete by the new firmware release from BAF as of April 2022. 

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

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
            "platform": "haiku",
            "discoveryInterval": 30
        }
    ]
```

## Notes

* On startup, platform will run discovery for the amount of time specified in the config (from 10-600 seconds, defaults to 30)
* Ideally services would be added depending on their existence. PRs welcome.

## TODO

* Use Fanv2.SwingMode for Haiku's "Whoosh"?
* Add support for Fanv2.RotationDirection.
* Create an OccupancySensor accessory.
* Allow setting the number of expected devices during discovery, as UDP broadcast is unreliable.
