/* =============================================================================
 * taxonomy.js  —  THE PARTS CHECKLIST + THE CAPABILITY LANGUAGE
 * -----------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * The whole app matches you to projects by *capability*, not by exact part.
 * A DHT22, a BME280, and an AHT10 all give you "sensor-temp" + "sensor-humidity".
 * A project only ever asks for the CAPABILITY (a short token), so ANY part that
 * provides that token satisfies it. That is the trick that makes substitutions
 * "just work" and keeps the catalog small.
 *
 * TWO THINGS LIVE HERE:
 *   1) PARTS      — every recognizable part, grouped by category, with the
 *                   capabilities it provides. The UI renders these as checkboxes.
 *   2) CAPABILITY_CANONICAL — for each capability token, the human-friendly
 *                   "you're missing THIS exact thing" wording used by the
 *                   "Could've Been" gap boxes and the Smart Shopping List.
 *
 * HOW TO ADD A PART: copy a line in PARTS, give it a unique id, set its `caps`.
 * HOW TO ADD A CAPABILITY: add the token to a part's caps AND add a friendly
 *   line to CAPABILITY_CANONICAL so gaps/shopping read well.
 *
 * This file is plain JS (not JSON) on purpose: browsers block fetch() of local
 * .json when you open index.html via file://. Embedding as a JS global means
 * the app runs by double-clicking the file AND when served. (See SPEC.md, D3.)
 * ===========================================================================*/

(function (root, factory) {
  // UMD-ish: works as a browser global AND as a Node module (so we can unit-test
  // the engine in plain Node without a browser).
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TAXONOMY = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  // ---- Display order of the category sections in the Inventory tab ----------
  // (Just cosmetic — controls column/group order, nothing logical.)
  const CATEGORIES = [
    { id: 'mcu',     name: 'Microcontrollers / Dev Boards' },
    { id: 'sensor',  name: 'Sensors & Modules' },
    { id: 'display', name: 'Displays' },
    { id: 'power',   name: 'Power' },
    { id: 'io',      name: 'Inputs / Outputs' },
    { id: 'passive', name: 'Passives' },
    { id: 'audio',   name: 'Audio' },
    { id: 'motor',   name: 'Motors & Actuators' },
    { id: 'rf',      name: 'Connectivity / Radio' },
    { id: 'misc',    name: 'Misc' },
  ];

  // ---- The parts checklist ---------------------------------------------------
  // Each entry: { id, name, cat, caps:[capability tokens] }
  // `caps` is the vocabulary the catalog speaks. Keep tokens short + stable.
  const PARTS = [
    // ===== MICROCONTROLLERS / DEV BOARDS (the full common lineup) ============
    // Note the capability differences — they're WHY some projects need a
    // specific board. e.g. a project needing "mcu-wifi" will NOT match an
    // Arduino Uno or a bare Pi Pico (they have no WiFi). That's intentional.
    { id: 'esp32',    name: 'ESP32 Dev Board',          cat: 'mcu',
      caps: ['mcu','mcu-wifi','mcu-ble','i2c','spi','pwm','adc','touch'] },
    { id: 'esp8266',  name: 'ESP8266 (NodeMCU)',        cat: 'mcu',
      caps: ['mcu','mcu-wifi','i2c','spi','pwm','adc'] },
    { id: 'esp32_c2', name: 'ESP32-C2',                cat: 'mcu',
      // RISC-V, WiFi + BLE 5 (no BT Classic, no touch) — common in cheap modules.
      caps: ['mcu','mcu-wifi','mcu-ble','i2c','spi','pwm','adc'] },
    { id: 'esp32_c3', name: 'ESP32-C3',                cat: 'mcu',
      // RISC-V, WiFi + BLE 5, USB-serial built in (no native USB device). No touch.
      caps: ['mcu','mcu-wifi','mcu-ble','i2c','spi','pwm','adc'] },
    { id: 'esp32_c5', name: 'ESP32-C5',                cat: 'mcu',
      // RISC-V, WiFi 6 + BLE 5 + Zigbee/Thread (802.15.4). No touch.
      caps: ['mcu','mcu-wifi','mcu-ble','zigbee','i2c','spi','pwm','adc'] },
    { id: 'esp32_c6', name: 'ESP32-C6',                cat: 'mcu',
      // RISC-V, WiFi 6 + BLE 5 + Zigbee/Thread (802.15.4). No touch.
      caps: ['mcu','mcu-wifi','mcu-ble','zigbee','i2c','spi','pwm','adc'] },
    { id: 'esp32_s3', name: 'ESP32-S3',                cat: 'mcu',
      // Xtensa dual-core, WiFi + BLE 5, native USB (HID), 2x CAN, CAM interface, touch.
      caps: ['mcu','mcu-wifi','mcu-ble','mcu-usb','camera','i2c','spi','pwm','adc','touch'] },
    { id: 'esp32_cam', name: 'ESP32-CAM',              cat: 'mcu',
      // ESP32 + OV2640 camera module; WiFi only (no BLE on the stock module).
      caps: ['mcu','mcu-wifi','camera','i2c','spi','pwm','adc'] },
    { id: 'wemos_d1', name: 'Wemos D1 Mini (ESP8266)', cat: 'mcu',
      // A specific ESP8266 form factor — same caps as esp8266, listed so owners find it.
      caps: ['mcu','mcu-wifi','i2c','spi','pwm','adc'] },
    { id: 'nodemcu_esp32', name: 'NodeMCU ESP32',     cat: 'mcu',
      // NodeMCU-style ESP32 breakout (ESP-WROOM-32). Full ESP32 caps.
      caps: ['mcu','mcu-wifi','mcu-ble','i2c','spi','pwm','adc','touch'] },
    { id: 'uno',      name: 'Arduino Uno',              cat: 'mcu',
      caps: ['mcu','i2c','spi','pwm','adc'] },
    { id: 'nano',     name: 'Arduino Nano',             cat: 'mcu',
      caps: ['mcu','i2c','spi','pwm','adc'] },
    { id: 'rpi3_4_5', name: 'Raspberry Pi 3 / 4 / 5',    cat: 'mcu',
      caps: ['mcu','mcu-wifi','mcu-ble','i2c','spi','pwm'] },
    { id: 'pico',     name: 'Raspberry Pi Pico',         cat: 'mcu',
      caps: ['mcu','i2c','spi','pwm','adc'] },          // bare Pico: no wireless
    { id: 'pico_w',   name: 'Raspberry Pi Pico W',       cat: 'mcu',
      caps: ['mcu','mcu-wifi','mcu-ble','i2c','spi','pwm','adc'] },
    { id: 'pico2w',   name: 'Raspberry Pi Pico 2 W',     cat: 'mcu',
      caps: ['mcu','mcu-wifi','mcu-ble','i2c','spi','pwm','adc'] },
    { id: 'zero',     name: 'Raspberry Pi Zero',         cat: 'mcu',
      caps: ['mcu','i2c','spi','pwm'] },                // headless Linux, no wireless
    { id: 'zero2w',   name: 'Raspberry Pi Zero 2 W',     cat: 'mcu',
      caps: ['mcu','mcu-wifi','mcu-ble','i2c','spi','pwm'] },
    { id: 'cyd',      name: 'CYD (ESP32 + TFT touch)',   cat: 'mcu',
      // The Cheap Yellow Display bundles an ESP32 AND a screen+touch, so it
      // provides both the MCU capabilities and a TFT display in one part.
      caps: ['mcu','mcu-wifi','mcu-ble','i2c','spi','pwm','adc','touch','display-spi-tft'] },

    // ===== SENSORS & MODULES =================================================
    { id: 'dht22',  name: 'DHT22 (temp + humidity)',  cat: 'sensor',
      caps: ['sensor-temp','sensor-humidity'] },
    { id: 'dht11',  name: 'DHT11 (temp + humidity)',  cat: 'sensor',
      caps: ['sensor-temp','sensor-humidity'] },
    { id: 'bme280', name: 'BME280 (temp/hum/press)',  cat: 'sensor',
      caps: ['sensor-temp','sensor-humidity','sensor-pressure','i2c','spi'] },
    { id: 'bmp280', name: 'BMP280 (temp/pressure)',   cat: 'sensor',
      caps: ['sensor-temp','sensor-pressure','i2c','spi'] },
    { id: 'ds18b20',name: 'DS18B20 (temp, 1-Wire)',   cat: 'sensor',
      caps: ['sensor-temp','onewire'] },
    { id: 'pir',    name: 'PIR motion sensor (HC-SR501)', cat: 'sensor',
      caps: ['sensor-motion'] },
    { id: 'moisture', name: 'Soil moisture sensor',   cat: 'sensor',
      caps: ['sensor-moisture'] },
    { id: 'hcsr04', name: 'Ultrasonic distance (HC-SR04)', cat: 'sensor',
      caps: ['sensor-distance'] },
    { id: 'ldr',    name: 'LDR / photocell (light)',  cat: 'sensor',
      caps: ['sensor-light','adc'] },
    { id: 'bh1750', name: 'BH1750 (light, I2C)',      cat: 'sensor',
      caps: ['sensor-light','i2c'] },
    { id: 'mq2',    name: 'MQ-2 gas/smoke sensor',    cat: 'sensor',
      caps: ['sensor-gas','adc'] },
    { id: 'mpu6050',name: 'MPU6050 (accel/gyro IMU)', cat: 'sensor',
      caps: ['sensor-imu','i2c'] },
    { id: 'acs712', name: 'ACS712 current sensor',    cat: 'sensor',
      caps: ['sensor-current','adc'] },

    // ===== DISPLAYS ==========================================================
    { id: 'ssd1306', name: 'SSD1306 OLED 128x64 (I2C)', cat: 'display',
      caps: ['display-i2c-oled','i2c'] },
    { id: 'sh1106',  name: 'SH1106 OLED (I2C)',         cat: 'display',
      caps: ['display-i2c-oled','i2c'] },
    { id: 'ili9341', name: 'ILI9341 TFT (SPI)',         cat: 'display',
      caps: ['display-spi-tft','spi'] },
    { id: 'st7735',  name: 'ST7735 TFT (SPI)',          cat: 'display',
      caps: ['display-spi-tft','spi'] },
    { id: 'lcd16x2', name: 'LCD 16x2 (I2C backpack)',   cat: 'display',
      caps: ['display-lcd','i2c'] },
    { id: 'eink',    name: 'E-ink display',             cat: 'display',
      caps: ['display-eink','spi'] },
    { id: 'ledmatrix', name: 'LED matrix (MAX7219)',    cat: 'display',
      caps: ['display-ledmatrix','spi'] },
    { id: 'neopixel', name: 'Addressable LED (NeoPixel)', cat: 'display',
      // Not a "screen" but it's an output display, so it lives here logically.
      caps: ['led-addressable','pwm'] },

    // ===== POWER =============================================================
    { id: 'battery',  name: 'Battery pack (AA/9V)',     cat: 'power',
      caps: ['battery'] },
    { id: 'cell18650',name: '18650 cell + holder',      cat: 'power',
      caps: ['battery-18650'] },
    { id: 'lipo',     name: 'LiPo battery',             cat: 'power',
      caps: ['lipo'] },
    { id: 'tp4056',   name: 'TP4056 charge module',     cat: 'power',
      caps: ['charge-tp4056'] },
    { id: 'boost',    name: 'Boost converter (5V from LiPo)', cat: 'power',
      caps: ['power-boost'] },
    { id: 'buck',     name: 'Buck converter',           cat: 'power',
      caps: ['power-buck'] },

    // ===== INPUTS / OUTPUTS =================================================
    { id: 'button',   name: 'Pushbutton',              cat: 'io',
      caps: ['button'] },
    { id: 'switch',   name: 'Toggle / slide switch',   cat: 'io',
      caps: ['switch'] },
    { id: 'pot',      name: 'Potentiometer',           cat: 'io',
      caps: ['potentiometer','adc'] },
    { id: 'encoder',  name: 'Rotary encoder',          cat: 'io',
      caps: ['rotary-encoder'] },
    { id: 'relay',    name: 'Relay module',            cat: 'io',
      caps: ['relay'] },

    // ===== PASSIVES =========================================================
    { id: 'led',      name: 'LED',                     cat: 'passive',
      caps: ['led'] },
    { id: 'resistor', name: 'Resistors (220Ω, 10kΩ…)', cat: 'passive',
      caps: ['resistor'] },
    { id: 'cap',      name: 'Capacitors',              cat: 'passive',
      caps: ['capacitor'] },

    // ===== AUDIO =============================================================
    { id: 'buzzer',  name: 'Piezo buzzer',             cat: 'audio',
      caps: ['buzzer'] },
    { id: 'speaker', name: 'Speaker',                  cat: 'audio',
      caps: ['speaker'] },
    { id: 'mic',     name: 'Microphone module',        cat: 'audio',
      caps: ['mic','adc'] },

    // ===== MOTORS & ACTUATORS ===============================================
    { id: 'servo',       name: 'Servo motor (SG90/MG996R)', cat: 'motor',
      caps: ['servo','pwm'] },
    { id: 'stepper',     name: 'Stepper motor (28BYJ-48)',   cat: 'motor',
      caps: ['stepper'] },
    { id: 'dcmotor',     name: 'DC motor',                   cat: 'motor',
      caps: ['dc-motor'] },
    { id: 'motordriver', name: 'Motor driver (L298N/ULN2003/A4988)', cat: 'motor',
      caps: ['motor-driver'] },

    // ===== CONNECTIVITY / RADIO =============================================
    { id: 'lora',  name: 'LoRa module (SX1278 + antenna)', cat: 'rf',
      caps: ['lora','spi'] },
    { id: 'rfid',  name: 'RFID reader (RC522)',              cat: 'rf',
      caps: ['rfid','spi'] },
    { id: 'nrf24', name: 'nRF24L01 2.4GHz radio',            cat: 'rf',
      caps: ['rf-24ghz','spi'] },
    { id: 'rf433', name: '433MHz TX/RX module',              cat: 'rf',
      caps: ['rf-433'] },

    // ===== MISC ==============================================================
    { id: 'rtc',    name: 'RTC module (DS3231)',   cat: 'misc',
      caps: ['rtc','i2c'] },
    { id: 'sdcard', name: 'microSD module',        cat: 'misc',
      caps: ['storage-sd','spi'] },
  ];

  // ---- Capability -> canonical "buy this exact thing" wording ----------------
  // Used by: (a) the red "You're missing: X" box on Could've-Been cards, and
  // (b) the Smart Shopping List. One editable object = single source of truth
  // for all human-readable gap text.
  const CAPABILITY_CANONICAL = {
    'mcu':            'Any microcontroller (ESP32, ESP8266, Arduino, Pi Pico, Pi, …)',
    'mcu-wifi':       'ESP32 / ESP8266 / C2–C6 / Pico W / Pico 2 W / Pi 3–5 / Zero 2 W (needs WiFi)',
    'mcu-ble':        'ESP32 / C2–C6 / Pico W / Pico 2 W / Pi 3–5 / Zero 2 W (needs Bluetooth)',
    'mcu-usb':        'ESP32-S3 (native USB / HID device)',
    'zigbee':         'ESP32-C5 / ESP32-C6 (802.15.4 / Thread / Zigbee radio)',
    'camera':         'ESP32-S3 or ESP32-CAM (OV2640 camera module)',
    'i2c':            'I2C bus (built into your MCU, or an I2C expander)',
    'spi':            'SPI bus (built into your MCU)',
    'pwm':            'PWM / analog-out pins (built into your MCU)',
    'adc':            'ADC / analog-in pins (built into your MCU)',
    'touch':          'Capacitive-touch pins (ESP32 / ESP32-S3)',
    'onewire':        '1-Wire bus (built into your MCU, for DS18B20)',
    'sensor-temp':    'Temp sensor (DHT22, BME280, or DS18B20)',
    'sensor-humidity':'Humidity sensor (DHT22 or BME280)',
    'sensor-pressure':'Pressure sensor (BMP280 or BME280)',
    'sensor-motion':  'PIR motion sensor (HC-SR501)',
    'sensor-moisture':'Soil moisture sensor',
    'sensor-distance': 'Ultrasonic distance sensor (HC-SR04)',
    'sensor-light':   'Light sensor (LDR or BH1750)',
    'sensor-gas':     'Gas/smoke sensor (MQ-2)',
    'sensor-imu':     'IMU / accelerometer (MPU6050)',
    'sensor-current': 'Current sensor (ACS712)',
    'display-i2c-oled':'I2C OLED (SSD1306 or SH1106)',
    'display-spi-tft': 'TFT display (ILI9341 / ST7735) or a CYD',
    'display-eink':   'E-ink display',
    'display-ledmatrix':'LED matrix (MAX7219)',
    'display-lcd':    'LCD 16x2 with I2C backpack',
    'rtc':            'RTC module (DS3231)',
    'lora':           'LoRa module (SX1278 + antenna)',
    'rfid':           'RFID reader (RC522)',
    'rf-24ghz':       'nRF24L01 2.4GHz radio',
    'rf-433':         '433MHz TX/RX module',
    'relay':          'Relay module (1/2/4/8-channel)',
    'buzzer':         'Piezo buzzer',
    'speaker':        'Speaker',
    'mic':            'Microphone module',
    'servo':          'Servo motor (SG90 / MG996R)',
    'stepper':        'Stepper motor (28BYJ-48)',
    'dc-motor':       'DC motor',
    'motor-driver':   'Motor driver (L298N / ULN2003 / A4988)',
    'button':         'Pushbutton',
    'switch':         'Toggle / slide switch',
    'potentiometer':  'Potentiometer',
    'rotary-encoder': 'Rotary encoder',
    'led':            'LED',
    'led-addressable':'Addressable LED (NeoPixel / WS2812)',
    'resistor':       'Resistor (220Ω, 10kΩ, …)',
    'capacitor':      'Capacitor',
    'battery':        'Battery pack (AA / 9V)',
    'battery-18650':  '18650 cell + holder',
    'lipo':           'LiPo battery',
    'charge-tp4056':  'TP4056 charge module',
    'power-boost':    'Boost converter (5V from LiPo)',
    'power-buck':     'Buck converter',
    'storage-sd':     'microSD module',
  };

  // ---- Capability groups (for the Phase 3B guided custom-part creator) -------
  // Instead of making a beginner type raw tokens, we show these buckets as
  // checklists. The GROUP order is what the UI renders; each token must exist
  // in CAPABILITY_CANONICAL above (engine.test.js asserts that to keep the two
  // in sync). WHY this grouping: it mirrors how a maker thinks about a board
  // ("it's a microcontroller", "it has WiFi", "it has a screen") rather than
  // the flat token vocabulary.
  const CAPABILITY_GROUPS = [
    { id: 'mcu', name: 'Microcontroller', caps: ['mcu', 'mcu-wifi', 'mcu-ble', 'mcu-usb', 'camera', 'zigbee'] },
    { id: 'buses', name: 'Buses / I/O pins', caps: ['i2c', 'spi', 'pwm', 'adc', 'touch', 'onewire'] },
    { id: 'sensors', name: 'Sensors', caps: [
      'sensor-temp', 'sensor-humidity', 'sensor-pressure', 'sensor-motion',
      'sensor-moisture', 'sensor-distance', 'sensor-light', 'sensor-gas',
      'sensor-imu', 'sensor-current' ] },
    { id: 'display', name: 'Display / Output', caps: [
      'display-i2c-oled', 'display-spi-tft', 'display-eink', 'display-ledmatrix',
      'display-lcd', 'led', 'led-addressable' ] },
    { id: 'audio', name: 'Audio', caps: ['buzzer', 'speaker', 'mic'] },
    { id: 'motor', name: 'Motors & Actuators', caps: ['servo', 'stepper', 'dc-motor', 'motor-driver', 'relay'] },
    { id: 'radio', name: 'Radio / Connectivity', caps: ['lora', 'rfid', 'rf-24ghz', 'rf-433', 'rtc'] },
    { id: 'power', name: 'Power', caps: [
      'battery', 'battery-18650', 'lipo', 'charge-tp4056', 'power-boost', 'power-buck' ] },
    { id: 'io', name: 'Inputs', caps: ['button', 'switch', 'potentiometer', 'rotary-encoder'] },
    { id: 'storage', name: 'Storage', caps: ['storage-sd', 'capacitor', 'resistor'] },
  ];

  // ---- Wiring "basics" we ASSUME you own (so we never nag about them) --------
  // These don't provide matching capabilities; they're just always-on context.
  // Kept here as documentation + so the UI can mention them.
  const ASSUMED_BASICS = ['breadboard', 'jumper wires', 'USB cable', 'hookup wire'];

  return { CATEGORIES, PARTS, CAPABILITY_CANONICAL, CAPABILITY_GROUPS, ASSUMED_BASICS };
});
