// WHY: Teaches driving a tiny I2C OLED and the Adafruit GFX drawing API.
// The SSD1306 (128x64) talks I2C at 0x3C. We clear the buffer, draw text and a
// shape, then push it with display() — the same foundation for gauges, menus,
// and any "screen" project.

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_W 128
#define SCREEN_H 64
#define OLED_ADDR 0x3C

Adafruit_SSD1306 display(SCREEN_W, SCREEN_H, &Wire, -1);

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);                       // ESP32 I2C pins
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("OLED not found!");
    while (1);                              // halt if display missing
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Hello, Maker!");

  // Draw a small filled rectangle as a "logo".
  display.drawRect(10, 20, 40, 30, SSD1306_WHITE);
  display.fillRect(55, 20, 30, 30, SSD1306_WHITE);

  display.display();                        // push buffer to screen
}

void loop() {
  // Static screen — nothing to update each frame.
  delay(1000);
}
