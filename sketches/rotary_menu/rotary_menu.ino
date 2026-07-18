// WHY: A rotary encoder is a knob that reports relative turns. The Encoder lib
// tracks position; we map position to a menu index and use the press switch to
// "select". Classic UI pattern for headless devices with one knob.

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Encoder.h>

#define SDA_PIN 21
#define SCL_PIN 22
#define SW_PIN 25

Adafruit_SSD1306 display(128, 64, &Wire, -1);
Encoder enc(32, 33);

const char* items[] = {"Start", "Settings", "WiFi", "About"};
const int N = 4;
long lastPos = 0;
int idx = 0;
bool selected = false;

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  pinMode(SW_PIN, INPUT_PULLUP);
}

void loop() {
  long pos = enc.read() / 4;        // 4 pulses per detent
  if (pos != lastPos) {
    idx = (idx + (pos > lastPos ? 1 : -1) + N) % N;
    lastPos = pos;
  }

  static int lastSw = HIGH;
  int sw = digitalRead(SW_PIN);
  if (sw == LOW && lastSw == HIGH) {
    selected = true;
    Serial.printf("Selected: %s\n", items[idx]);
  }
  lastSw = sw;

  display.clearDisplay();
  display.setTextSize(1);
  for (int i = 0; i < N; i++) {
    display.setCursor(8, 8 + i * 12);
    display.print(i == idx ? "> " : "  ");
    display.println(items[i]);
  }
  if (selected) { display.setCursor(8, 56); display.print("OK!"); selected = false; }
  display.display();
  delay(50);
}
