// WHY: A plant isn't just "wet or dry" — it lives on a gradient. We read a
// capacitive moisture sensor (0..4095) and bucket it into DRY/OK/WET, then
// draw the reading and a horizontal bar so you can eyeball the trend.

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SDA_PIN 21
#define SCL_PIN 22
#define MOIST_PIN 34

Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  pinMode(MOIST_PIN, INPUT);
}

void loop() {
  int raw = analogRead(MOIST_PIN);          // 0..4095
  int pct = map(raw, 0, 4095, 0, 100);      // 0=dry, 100=wet
  pct = constrain(pct, 0, 100);

  const char* state;
  if (pct < 30) state = "DRY";
  else if (pct < 70) state = "OK";
  else state = "WET";

  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("Soil: ");
  display.print(state);
  display.print(" ");
  display.print(pct);
  display.println("%");

  // Bar from x=0..127
  int barW = map(pct, 0, 100, 0, 127);
  display.drawRect(0, 30, 127, 16, SSD1306_WHITE);
  display.fillRect(1, 31, barW - 2, 14, SSD1306_WHITE);
  display.display();

  Serial.printf("%s %d%%\n", state, pct);
  delay(1000);
}
