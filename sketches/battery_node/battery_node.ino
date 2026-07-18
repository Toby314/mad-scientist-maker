// WHY: Battery nodes must sip power. We read the BME280 once, print it, then
// deep-sleep for 60s. The 18650 feeds a TP4056 (charge) into a boost converter
// to 5V; deep-sleep + a timer wakeup is what makes the battery last months.

#include <Wire.h>
#include <Adafruit_BME280.h>
#include <esp_sleep.h>

#define SDA_PIN 21
#define SCL_PIN 22

Adafruit_BME280 bme;

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  bme.begin(0x76);

  float t = bme.readTemperature();
  float h = bme.readHumidity();
  Serial.printf("Temp: %.1fC  Hum: %.1f%%\n", t, h);
  Serial.println("Sleeping 60s...");

  // Wake every 60s from the RTC timer (no GPIO needed).
  esp_sleep_enable_timer_wakeup(60 * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() { /* never reached — deep sleep restarts setup() */ }
