# Homebridge Haiku by Big Ass Fans Plugin

A homebridge plugin for Haiku by BAF devices.

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

* On startup, platform will run discovery for 30 seconds
* Ideally services would be added depending on their existence. PRs welcome.

## TODO

* Use Fanv2.SwingMode for Haiku's "Whoosh"?
* Add support for Fanv2.RotationDirection.
* Create an OccupancySensor accessory.
* Allow setting the number of expected devices during discovery, as UDP broadcast is unreliable.