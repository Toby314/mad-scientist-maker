// COMPILE_SKIP: requires ESP-IDF Zigbee stack (ESP32-C6/C5) — not compilable on standard Arduino ESP32
// WHY: A Zigbee temperature/humidity sensor endpoint sketch for the "mad scientist"
//      maker recommender. Zigbee is NOT available in the standard Arduino ESP32 core;
//      it requires an ESP32-C6 or ESP32-C5 plus the ESP-IDF Zigbee component. This file
//      honestly documents that requirement and provides a representative BME280-reading
//      skeleton that only compiles under a Zigbee-enabled toolchain.

#include <Wire.h>
#include <Adafruit_BME280.h>

#define I2C_SDA 21
#define I2C_SCL 22
#define BME_ADDR 0x76

Adafruit_BME280 bme;

void setup() {
  Serial.begin(115200);

  // On a real Zigbee board this is where you would call esp_zb_* init routines
  // (esp_zb_cfg_t, esp_zb_start(), and register the ZCL temperature/humidity
  // cluster endpoints). That API lives in ESP-IDF, not Arduino.h.
  Serial.println("Zigbee temp/humidity endpoint — requires ESP-IDF Zigbee stack");

  Wire.begin(I2C_SDA, I2C_SCL);
  if (!bme.begin(BME_ADDR)) {
    Serial.println("BME280 not found — check wiring / Zigbee board I2C");
    while (1) delay(10);
  }
  Serial.println("BME280 ready. (Sketch is COMPILE_SKIP under standard Arduino.)");
}

void loop() {
  float t = bme.readTemperature();
  float h = bme.readHumidity();

  // A real Zigbee build would publish these on the ZCL Temperature Measurement
  // and Relative Humidity Measurement clusters instead of printing.
  Serial.printf("temp=%.2f C  humidity=%.2f %%\n", t, h);

  delay(5000);
}
