// Reference smoke-test (core 3.3.10): correct LEDC + tone API
#include <Arduino.h>

#define LED_PIN 2
#define BTN_PIN 4
#define BUZ_PIN 15

void setup() {
  Serial.begin(115200);
  // CORE 3.x LEDC: ledcAttach(pin, freqHz, resolutionBits) -> auto-assigns channel
  ledcAttach(LED_PIN, 5000, 8);   // 8-bit -> duty 0..255
  pinMode(BTN_PIN, INPUT_PULLUP);
  tone(BUZ_PIN, 440, 200);        // pin, freqHz, durMs
  noTone(BUZ_PIN);
}

void loop() {
  int raw = analogRead(34);             // 0..4095
  int duty = map(raw, 0, 4095, 0, 255); // 8-bit duty
  ledcWrite(LED_PIN, duty);             // by PIN
  bool pressed = digitalRead(BTN_PIN) == LOW;
  Serial.println(pressed ? "ON" : "off");
  delay(200);
}
