import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';

import { HomebridgeHaikuPlatform } from './platform';
import { Device } from '@nightbird/haiku-senseme';

export class HaikuPlatformFanAccessory {    
  private service: Service;
  private device: Device;

  constructor(
    private readonly platform: HomebridgeHaikuPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.device = new Device({
      name: this.accessory.context.device.name, 
      id: this.accessory.context.device.id, 
      type: this.accessory.context.device.type, 
      ip: this.accessory.context.device.ip});

    // how to make sure this completes?
    this.device.refreshAll();

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Big Ass Fans')
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.device.type)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    // get firmware information
    this.device.device.firmware.listen()
      .on('change', fw => {
        this.platform.log.debug(`got updated firmware (${this.device.name}): ${fw}`);
        this.accessory.getService(this.platform.Service.AccessoryInformation)!
          .setCharacteristic(this.platform.Characteristic.FirmwareRevision, fw);
      });

    // get the Fanv2 service if it exists, otherwise create a new Fanv2 service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Fanv2) || 
        this.accessory.addService(this.platform.Service.Fanv2, this.accessory.context.device.name);

    // To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
    // when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
    //this.accessory.getService('NAME') ?? this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE');

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.name);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // i don't have a fan, so can't test 
    // register handlers for the Active Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .on('set', this.setActive.bind(this))
      .on('get', this.getActive.bind(this));

  }

  /**
   * SET Active
   */
  setActive(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug(`Set Characteristic Active (${this.device.name}) ->`, value);
    if(value) {
      this.device.fan.power.value = 'on';
    } else {
      this.device.fan.power.value = 'off';
    }
    callback(null);
  }


  /**
   * GET Fan Active Characteristic
   */
  getActive(callback: CharacteristicGetCallback) {
    let currentState = this.service.getCharacteristic(this.platform.Characteristic.Active).value as boolean;
    this.device.fan.speed.refresh();
    this.device.fan.speed.listen()
      .on('change', speed => {
        if (speed > 0) {
          currentState = true;
        } else {
          currentState = false;
        }
        this.platform.log.debug(`(${this.device.name}) fan speed: ${speed}, Homekit colortemp: ${currentState}`);
      });

    callback(null, currentState);
  }

}
