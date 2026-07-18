// WHY: A wall clock that never drifts. We sync an accurate DS3231 hardware
// RTC from the internet (NTP) once at boot, then keep time offline from the
// RTC — no WiFi needed after startup, so it survives power loss.

#include <WiFi.h>
#include <time.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <RTClib.h>

#define SDA_PIN 21
#define SCL_PIN 22

const char* SSID = "YOUR_SSID";
const char* PASS = "YOUR_PASSWORD";

Adafruit_SSD1306 display(128, 64, &Wire, -1);
RTC_DS3231 rtc;
bool synced = false;

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);

  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  rtc.begin();
  if (rtc.lostPower()) {
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }

  // One-time NTP sync of the RTC at boot.
  WiFi.begin(SSID, PASS);
  Serial.print("Connecting WiFi");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500); Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    struct tm t;
    if (getLocalTime(&t, 5000)) {
      rtc.adjust(DateTime(t.tm_year + 1900, t.tm_mon + 1, t.tm_mday,
                          t.tm_hour, t.tm_min, t.tm_sec));
      synced = true;
      Serial.println(" RTC synced from NTP");
    }
  }
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
}

void loop() {
  DateTime now = rtc.now();
  char buf[9];
  sprintf(buf, "%02d:%02d:%02d", now.hour(), now.minute(), now.second());

  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(8, 16);
  display.println(buf);
  display.setTextSize(1);
  display.setCursor(8, 44);
  display.print(synced ? "RTC+NTP" : "RTC only");
  display.display();
  delay(250);
}
