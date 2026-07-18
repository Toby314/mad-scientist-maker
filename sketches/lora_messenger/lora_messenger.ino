// WHY: LoRa gives km-range radio with no WiFi/internet. Two boards talk a
// simple ping/pong: a NODE sends "ping", a BASE answers "pong". Flip ROLE
// per board. Great for remote sensor links.

#include <SPI.h>
#include <LoRa.h>

// Set ROLE to NODE on one board, BASE on the other.
#define ROLE NODE

#define NSS_PIN 5
#define RST_PIN 14
#define DIO0_PIN 26

void setup() {
  Serial.begin(115200);
  SPI.begin(18, 19, 23, 5);
  LoRa.setPins(NSS_PIN, RST_PIN, DIO0_PIN);
  while (!LoRa.begin(915E6)) {
    Serial.println("LoRa init failed");
    delay(1000);
  }
  LoRa.setSpreadingFactor(7);
  Serial.println("LoRa ready");
}

void loop() {
#if ROLE == NODE
  // NODE: send ping, wait for pong.
  LoRa.beginPacket();
  LoRa.print("ping");
  LoRa.endPacket();
  Serial.println(">> ping");

  unsigned long t = millis();
  while (millis() - t < 2000) {
    int n = LoRa.parsePacket();
    if (n) {
      String s; while (LoRa.available()) s += (char)LoRa.read();
      Serial.println("<< " + s);
      break;
    }
  }
  delay(2000);
#else
  // BASE: listen for ping, reply pong.
  int n = LoRa.parsePacket();
  if (n) {
    String s; while (LoRa.available()) s += (char)LoRa.read();
    Serial.println("<< " + s);
    LoRa.beginPacket();
    LoRa.print("pong");
    LoRa.endPacket();
    Serial.println(">> pong");
  }
  delay(100);
#endif
}
