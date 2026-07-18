// WHY: A weather node/base pair over LoRa — the NODE reads BME280 temperature &
//      humidity and broadcasts "t,h" every 5s; the BASE listens and prints packets
//      to Serial. No Wi-Fi or PC required for a remote field station.
//      Flip ROLE to 1 and reflash a second board to act as the BASE.

#define ROLE 0 // 0=NODE, 1=BASE

#include <SPI.h>
#include <Wire.h>
#include <LoRa.h>
#include <Adafruit_BME280.h>

#define I2C_SDA 21
#define I2C_SCL 22
#define BME_ADDR 0x76

// LoRa pins (ESP32): NSS=5, RST=14, DIO0=26; SPI bus 18/23/19
#define LORA_SCK 18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_SS 5
#define LORA_RST 14
#define LORA_DIO0 26

Adafruit_BME280 bme;

void setup() {
  Serial.begin(115200);
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(915E6)) {
    Serial.println("LoRa init failed");
    while (1) delay(10);
  }

#if ROLE == 0
  Wire.begin(I2C_SDA, I2C_SCL);
  if (!bme.begin(BME_ADDR)) {
    Serial.println("BME280 not found");
    while (1) delay(10);
  }
  Serial.println("NODE: sending weather every 5s");
#else
  Serial.println("BASE: listening for weather packets");
#endif
}

void loop() {
#if ROLE == 0
  float t = bme.readTemperature();
  float h = bme.readHumidity();

  LoRa.beginPacket();
  LoRa.print(t, 2);
  LoRa.print(",");
  LoRa.print(h, 2);
  LoRa.endPacket();

  Serial.printf("Sent  t=%.2f C  h=%.2f %%\n", t, h);
  delay(5000);
#else
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String packet = "";
    while (LoRa.available()) packet += (char)LoRa.read();
    Serial.print("Received: ");
    Serial.println(packet);
    Serial.printf("RSSI: %d dBm\n", LoRa.packetRssi());
  }
  delay(10);
#endif
}
