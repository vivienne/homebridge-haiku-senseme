import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';

import { HomebridgeHaikuPlatform } from './platform';
import { Device } from '@nightbird/haiku-senseme';

export class HaikuPlatformFanAccessory {
  private service: Service;
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
    const currentState = this.service.getCharacteristic(this.platform.Characteristic.Active).value as boolean;

    this.service.updateCharacteristic(this.platform.Characteristic.Active, currentState);

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

    this.device.fan.speed.refresh();
    this.device.fan.speed.listen()
      .on('change', speed => {
        currentSpeed = Math.round(speed * 100 / this.maxSpeed);

        this.platform.log.debug(`(${this.device.name}) API speed ${speed} Homekit speed (${currentSpeed})`);
      });

    this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, currentSpeed);

    callback(null, currentSpeed);
  }

}
