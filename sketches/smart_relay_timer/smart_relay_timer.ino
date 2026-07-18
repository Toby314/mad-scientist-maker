// WHY: A real outlet timer uses the RTC, not millis() (which resets on power
// loss). We compare rtc.now() to ON/OFF wall-clock times and drive a relay —
// so the lamp turns on at 07:00 and off at 22:00 every day, forever, offline.

#include <Wire.h>
#include <RTClib.h>

#define SDA_PIN 21
#define SCL_PIN 22
#define RELAY_PIN 12

RTC_DS3231 rtc;

const int ON_HOUR = 7,  ON_MIN = 0;
const int OFF_HOUR = 22, OFF_MIN = 0;

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  rtc.begin();
  if (rtc.lostPower()) rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  pinMode(RELAY_PIN, OUTPUT);
}

void loop() {
  DateTime now = rtc.now();
  int mins = now.hour() * 60 + now.minute();
  int onMins = ON_HOUR * 60 + ON_MIN;
  int offMins = OFF_HOUR * 60 + OFF_MIN;

  bool on = (onMins <= offMins)
    ? (mins >= onMins && mins < offMins)
    : (mins >= onMins || mins < offMins);   // handle wrap past midnight

  digitalWrite(RELAY_PIN, on ? HIGH : LOW);
  Serial.printf("%02d:%02d relay %s\n", now.hour(), now.minute(), on ? "ON" : "OFF");
  delay(1000);
}
