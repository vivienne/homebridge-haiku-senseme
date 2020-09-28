import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { HaikuPlatformLightAccessory } from './lightAccessory';
import { HaikuPlatformFanAccessory } from './fanAccessory';
import { Device, SenseME } from '@nightbird/haiku-senseme';

/**
 * HomebridgeHaikuPlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class HomebridgeHaikuPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // This is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info(`Loading accessory from cache: ${accessory.UUID} ${accessory.displayName}`);

    // Add the restored accessory to the accessories cache so we can track if it has already been registered.
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {
    SenseME.setConfig({ broadcastAddress: this.config.broadcastAddress || undefined })
      .on('founddevice', (device: Device) => {

        // populate deviceInfo
        const deviceInfo = {
          name: device.name,
          type: device.type,
          id: device.id,
          ip: device.ip,
        };

        this.log.info(`Found a device: ${device.name} / ${device.type} / ${device.ip} / ${device.id}`);

        // generate unique UUID
        const uuid = this.api.hap.uuid.generate(deviceInfo.id);

        this.log.debug(`Assigning UUID ${uuid} to ${deviceInfo.name}`);

        // check if we already know about this accessory
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

        if (existingAccessory) {
          this.log.debug('Restoring existing accessory from cache:', existingAccessory.displayName);

          existingAccessory.context.device = deviceInfo;

          this.api.updatePlatformAccessories([existingAccessory]);

          if (deviceInfo.type === 'LIGHT,HAIKU') {
            new HaikuPlatformLightAccessory(this, existingAccessory);

          } else if (deviceInfo.type === 'FAN,HAIKU' || deviceInfo.type === 'FAN,HAIKU,SENSEME') {
            new HaikuPlatformFanAccessory(this, existingAccessory);

          } else {
            this.log.error(`Not sure what to do with this device type: ${deviceInfo.type}`);
          }

        } else {

          // Only add accessories we know how to control to the device cache.
          if (deviceInfo.type === 'LIGHT,HAIKU' || deviceInfo.type === 'FAN,HAIKU' || deviceInfo.type === 'FAN,HAIKU,SENSEME') {

            this.log.info('Adding new accessory:', deviceInfo.name);

            const accessory = new this.api.platformAccessory(deviceInfo.name, uuid);

            accessory.context.device = deviceInfo;

            this.log.debug(`name: ${accessory.displayName} uuid: ${accessory.UUID}`);

            if (deviceInfo.type === 'LIGHT,HAIKU') {
              new HaikuPlatformLightAccessory(this, accessory);

            } else if (deviceInfo.type === 'FAN,HAIKU' || deviceInfo.type === 'FAN,HAIKU,SENSEME') {
              new HaikuPlatformFanAccessory(this, accessory);
            }

            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

          } else if (deviceInfo.type === 'SWITCH,SENSEME') {
            this.log.warn(`Wall control switches are not supported yet: ${deviceInfo.name} (${deviceInfo.type})`);

          } else {
            this.log.error(`Not sure what to do with this device type: ${deviceInfo.name} (${deviceInfo.type})`);
          }
        }
      })
      .on('lostdevice', (device: Device) => {
        this.log.info(`Lost a device: ${device.name} (${device.ip})`);
      })
      .discover();

    // run discovery for 10 seconds
    setTimeout(() => {
      SenseME.cancelDiscovery();
      SenseME.getAllDevices().forEach(dev => dev.disconnect());
    }, 10000);

    // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
    // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  }
}
