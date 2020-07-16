import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';

import { HomebridgeHaikuPlatform } from './platform';
import { Device, SenseME } from '@nightbird/haiku-senseme';

export class HaikuPlatformAccessory {
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
      .on('set', this.setOn.bind(this))
      .on('get', this.getOn.bind(this));

    // register handlers for the Brightness Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .on('set', this.setBrightness.bind(this))
      .on('get', this.getBrightness.bind(this));       

    // ColorTemperature - min/max hardcoded because of refresh time
    this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
      .on('set', this.setColorTemperature.bind(this))
      .on('get', this.getColorTemperature.bind(this))
      .setProps({minValue: 200, maxValue: 454});
  }

  /**
   * SET On
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('Set Characteristic On ->', value);
    if(value) {
      this.device.light.power.value = 'on';
      this.service.updateCharacteristic(this.platform.Characteristic.On, true);
    } else {
      this.device.light.power.value = 'off';
      this.service.updateCharacteristic(this.platform.Characteristic.On, false);
    }
    callback(null);
  }

  /**
   * GET On
   */
  getOn(callback: CharacteristicGetCallback) {
    let currentOn = this.service.getCharacteristic(this.platform.Characteristic.On).value as boolean;
    this.device.light.power.refresh();
    this.device.light.power.listen()
      .on('change', power => {
        this.platform.log.debug(`Current power: ${power}`);
        if(power === 'ON') {
          currentOn = true;
        }
        if(power === 'OFF') {
          currentOn = false;
        }
      });
    callback(null, currentOn);
  }

  /**
   * SET Brightness
   */
  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('Set Characteristic Brightness -> ', value);
    this.platform.log.debug('maximum from API', this.device.light.brightness.maximum.value);
    const maxVal = this.device.light.brightness.maximum.value || 16;
    const apiValue = value as number/100*maxVal;
    this.platform.log.debug('Set Characteristic Brightness (apiValue) -> ', apiValue);
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
    let currentBrightness = this.service.getCharacteristic(this.platform.Characteristic.Brightness).value as number;
    this.device.light.brightness.refresh();
    this.device.light.brightness.listen()
      .on('change', brightness => {
        currentBrightness = brightness/maxVal*100;
        this.platform.log.debug(`API brightness: ${brightness} Homekit brightness: ${currentBrightness}`);
      });

    callback(null, currentBrightness);
  }

  /**
   * SET ColorTemperature
   */
  setColorTemperature(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('Set Characteristic ColorTemperature -> ', value);
    const tempValue = value as number;
    //this.platform.log.debug('maximum from API', this.device.light.temperature.maximum.value);
    //const maxVal = this.device.light.temperature.maximum.value || 5000;
    const apiValue = 1000000/tempValue;
    this.platform.log.debug('Set Characteristic ColorTemperature (apiValue) -> ', apiValue);
    this.device.light.temperature.value = apiValue;

    callback(null);
  }
  
  /**
   * GET ColorTemperature
   */
  getColorTemperature(callback: CharacteristicGetCallback) {
    let currentTemperature = this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature).value as number;
    this.device.light.temperature.refresh();
    this.device.light.temperature.listen()
      .on('change', temperature => {
        currentTemperature = 1000000/temperature;
        this.platform.log.debug(`API colortemp: ${temperature} Homekit colortemp: ${currentTemperature}`);
      });

    callback(null, currentTemperature);
  }

}
