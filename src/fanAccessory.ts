import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';

import { HomebridgeHaikuPlatform } from './platform';
import { Device } from '@nightbird/haiku-senseme';

export class HaikuPlatformFanAccessory {
  private service: Service;
  private lightService!: Service;
  private device: Device;

  // TODO: Get this into haiku-senseme.
  private readonly maxSpeed = 7;

  constructor(
    private readonly platform: HomebridgeHaikuPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.device = new Device({
      name: this.accessory.context.device.name,
      id: this.accessory.context.device.id,
      type: this.accessory.context.device.type,
      ip: this.accessory.context.device.ip,
    });

    // how to make sure this completes?
    this.device.refreshAll();

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Big Ass Fans')
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.device.type)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.device.id);

    // get firmware information
    this.device.device.firmware.listen()
      .on('change', fw => {
        this.platform.log.debug(`Got updated firmware (${this.device.name}): ${fw}`);
        this.accessory.getService(this.platform.Service.AccessoryInformation)!
          .setCharacteristic(this.platform.Characteristic.FirmwareRevision, fw);
      });

    // Get the Fanv2 service if it exists, otherwise create a new Fanv2 service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Fanv2) ||
      this.accessory.addService(this.platform.Service.Fanv2, this.accessory.context.device.name);

    this.device.device.hasLight.listen()
      .on('change', has_light => {
        this.platform.log.debug(`Got updated hasLight (${this.device.name}): ${has_light}`);
        if (has_light) {
          this.lightService = this.accessory.getService(this.platform.Service.Lightbulb) ||
          this.accessory.addService(this.platform.Service.Lightbulb, this.accessory.context.device.name + ' Light');

          this.lightService.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.name);

          // register handlers for the On/Off Characteristic
          this.lightService.getCharacteristic(this.platform.Characteristic.On)
            .on('set', this.setOn.bind(this))
            .on('get', this.getOn.bind(this));

          // register handlers for the Brightness Characteristic
          this.lightService.getCharacteristic(this.platform.Characteristic.Brightness)
            .on('set', this.setBrightness.bind(this))
            .on('get', this.getBrightness.bind(this));

          // listen for changes to properties we care about
          this.device.light.power.listen()
            .on('change', power => {
              this.platform.log.debug(`Got updated power value (${this.device.name}): ${power}`);
              if (power === 'ON') {
                this.lightService.updateCharacteristic(this.platform.Characteristic.On, true);
              }
              if (power === 'OFF') {
                this.lightService.updateCharacteristic(this.platform.Characteristic.On, false);
              }
            });

          this.device.light.brightness.listen()
            .on('change', brightness => {
              this.lightService.updateCharacteristic(this.platform.Characteristic.Brightness, brightness / 16 * 100);
              this.platform.log.debug(`Got updated brightness (${this.device.name}): ${brightness}`); 
            });

        }
      });
    // To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
    // when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
    //this.accessory.getService('NAME') ?? this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE');

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.name);

    // Each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Fanv2

    // Register handlers for the Active Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .on('set', this.setActive.bind(this))
      .on('get', this.getActive.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .on('set', this.setRotationSpeed.bind(this))
      .on('get', this.getRotationSpeed.bind(this));

    this.device.fan.power.listen()
      .on('change', power => {
        this.platform.log.debug(`Got updated power value (${this.device.name}): ${power}`);
        if (power === 'ON') {
          this.service.updateCharacteristic(this.platform.Characteristic.Active, true);
        }
        if (power === 'OFF') {
          this.service.updateCharacteristic(this.platform.Characteristic.Active, false);
        }
      });

    this.device.fan.speed.listen()
      .on('change', speed => {
        this.platform.log.debug(`Got updated fan speed (${this.device.name}): ${speed})`);
        this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, Math.round(speed * 100 / this.maxSpeed));
      });

  }

  // SET Active
  setActive(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug(`Set Characteristic Active (${this.device.name}) -> ${value}`);
    if (value) {
      this.device.fan.power.value = 'on';
    } else {
      this.device.fan.power.value = 'off';
    }
    callback(null);
  }

  // GET Fan Active Characteristic
  getActive(callback: CharacteristicGetCallback) {
    let currentState = this.service.getCharacteristic(this.platform.Characteristic.Active).value as boolean;
    const power = this.device.fan.power.value;
    this.platform.log.debug(`Current power (${this.device.name}): ${power}`);
    if (power === 'on') {
      currentState = true;
    }
    if (power === 'off') {
      currentState = false;
    }

    callback(null, currentState);
  }

  // Set the current rotation speed, converting from Homekit's 0-7 to BAF's 0-100.
  setRotationSpeed(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    if (value as number === 0) {
      this.device.fan.speed.value = 0;
    } else {
      this.device.fan.speed.value = Math.round(value as number * this.maxSpeed / 100);
    }

    this.platform.log.debug(`Setting RotationSpeed (${this.device.name}) -> Homekit speed ${this.device.fan.speed.value}`);

    this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, this.device.fan.speed.value);

    callback(null);
  }

  // Get the current rotation speed, converting from the BAF 0-100 value to Homekit's 0-7
  getRotationSpeed(callback: CharacteristicGetCallback) {
    let currentSpeed = this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed).value as number;
    const speed = this.device.fan.speed.value;

    currentSpeed = Math.round(speed * 100 / this.maxSpeed);
    this.platform.log.debug(`(${this.device.name}) API speed ${speed} Homekit speed (${currentSpeed})`);

    callback(null, currentSpeed);
  }


  /**
   * SET On
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug(`Set Characteristic On (${this.device.name}) ->`, value);
    if (value) {
      this.device.light.power.value = 'on';
    } else {
      this.device.light.power.value = 'off';
    }
    callback(null);
  }

  /**
   * GET On
   */
  getOn(callback: CharacteristicGetCallback) {
    let currentOn = this.lightService.getCharacteristic(this.platform.Characteristic.On).value as boolean;
    const power = this.device.light.power.value;
    this.platform.log.debug(`Current power (${this.device.name}): ${power}`);
    if (power === 'on') {
      currentOn = true;
    }
    if (power === 'off') {
      currentOn = false;
    }
    callback(null, currentOn);
  }

  /**
   * SET Brightness
   */
  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug(`Set Characteristic Brightness (${this.device.name}) ->`, value);
    this.platform.log.debug('maximum from API', this.device.light.brightness.maximum.value);
    const maxVal = this.device.light.brightness.maximum.value || 16;
    const apiValue = value as number / 100 * maxVal;
    this.platform.log.debug(`Set Characteristic Brightness (apiValue) (${this.device.name}) ->`, apiValue);
    this.device.light.brightness.value = apiValue;

    callback(null);
  }

  /**
   * GET Brightness
   */
  getBrightness(callback: CharacteristicGetCallback) {
    //const maxVal = this.device.light.brightness.maximum.value || 16;
    // hardcoded for now, how to make sure that the values are refreshed?
    const maxVal = 16;
    let currentBrightness = this.lightService.getCharacteristic(this.platform.Characteristic.Brightness).value as number;
    const brightness = this.device.light.brightness.value;
    
    currentBrightness = brightness / maxVal * 100;
    this.platform.log.debug(`(${this.device.name}) API brightness: ${brightness} Homekit brightness: ${currentBrightness}`);

    callback(null, currentBrightness);
  }

}
