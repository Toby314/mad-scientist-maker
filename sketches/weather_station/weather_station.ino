// WHY: Teaches I2C sensors and reading calibrated environment data.
// The BME280 talks over I2C (SDA 21 / SCL 22) at address 0x76 and hands us
// temperature + humidity directly in human units — no ADC math needed. This is
// the foundation of any weather or climate-logging project.

#include <Wire.h>
#include <Adafruit_BME280.h>

Adafruit_BME280 bme;   // I2C instance (uses Wire)

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);              // ESP32 I2C pins
  if (!bme.begin(0x76)) {
    Serial.println("BME280 not found — check wiring/address!");
    while (1);                     // halt if sensor missing
  }
  Serial.println("temp_C,humidity_%");
}

void loop() {
  float t = bme.readTemperature();   // °C
  float h = bme.readHumidity();      // %

  Serial.print(t, 1);
  Serial.print(", ");
  Serial.println(h, 1);

  delay(2000);   // read every 2 seconds
}
