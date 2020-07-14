import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';

import { HomebridgeHaikuPlatform } from './platform';
import { Device, SenseME } from '@nightbird/haiku-senseme';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class HaikuPlatformAccessory {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */

  constructor(
    private readonly platform: HomebridgeHaikuPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Big Ass Fans')
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.device.type)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');
    //.setCharacteristic(this.platform.Characteristic.FirmwareRevision, 'Default-FW')

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    // eslint-disable-next-line max-len
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb, this.accessory.context.device.name);

    // To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
    // when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
    //this.accessory.getService('NAME') ?? this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE');

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.name);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on('set', this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

    // register handlers for the Brightness Characteristic
    //this.service.getCharacteristic(this.platform.Characteristic.Brightness)
    //  .on('set', this.setBrightness.bind(this));       // SET - bind to the 'setBrightness` method below

    // EXAMPLE ONLY
    // Example showing how to update the state of a Characteristic asynchronously instead
    // of using the `on('get')` handlers.
    //
    // Here we change update the brightness to a random value every 5 seconds using 
    // the `updateCharacteristic` method.
    /* setInterval(() => {
      // assign the current brightness a random value between 0 and 100
      this.device.light.power.refresh();
      this.device.light.power.listen()
        .on('change', power => {
          this.platform.log.debug(`Current power: ${power}`);
          if(power === 'on') {
            this.service.updateCharacteristic(this.platform.Characteristic.On, true); 
          }
          if(power === 'off') {
            this.service.updateCharacteristic(this.platform.Characteristic.On, false); 
          }
        });
      // push the new value to HomeKit
      this.platform.log.debug('Pushed updated current On state to HomeKit:', this.device.light.power.value);
    }, 10000);*/
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    // implement your own code to turn your device on/off
    //this.exampleStates.On = value as boolean;
    const device = SenseME.getDeviceById(this.accessory.context.id);
    const currentOn = device.light.power.value; 
    this.platform.log.debug('test setOn');
    if(currentOn === 'on') {
      device.light.power.value = 'on';
    } else {
      device.light.power.value = 'off';
    }

    this.platform.log.debug('Set Characteristic On ->', value);

    // you must call the callback function
    callback(null);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   * 
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   * 
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  getOn(callback: CharacteristicGetCallback) {
    const value = true;
    const device = SenseME.getDeviceById(this.accessory.context.id);

    // implement your own code to check if the device is on
    device.light.power.refresh();
    device.light.power.listen()
      .on('change', power => this.platform.log.debug(`Current power: ${power}`));
    // you must call the callback function
    // the first argument should be null if there were no errors
    // the second argument should be the value to return
    callback(null, value);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  /* setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    // implement your own code to set the brightness
    this.device.light.brightness.value = value as number;

    this.platform.log.debug('Set Characteristic Brightness -> ', value);

    // you must call the callback function
    callback(null);
  }*/

}
