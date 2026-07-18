// WHY: A tiny weather station. A BME280 reads local temperature/humidity and
// we draw it on the OLED. A clearly commented block shows how to ALSO fetch a
// remote forecast over WiFi (HTTP GET + ArduinoJson) — kept compiling with
// placeholders so the build never requires the network.

#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_BME280.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>

#define SDA_PIN 21
#define SCL_PIN 22

const char* SSID = "YOUR_SSID";
const char* PASS = "YOUR_PASSWORD";
const char* WEATHER_URL = "http://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current=temperature_2m";

Adafruit_SSD1306 display(128, 64, &Wire, -1);
Adafruit_BME280 bme;

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  bme.begin(0x76);
}

void loop() {
  float t = bme.readTemperature();
  float h = bme.readHumidity();

  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(0, 10);
  display.print("In: ");
  display.print(t, 0);
  display.println("C");
  display.print("Hum: ");
  display.print(h, 0);
  display.println("%");
  display.display();

  // ---- OPTIONAL ONLINE FORECAST (commented path) ----
  // Only runs if you connect WiFi; compiles fine without a network.
  // WiFi.begin(SSID, PASS);
  // while (WiFi.status() != WL_CONNECTED) delay(500);
  // HTTPClient http;
  // http.begin(WEATHER_URL);
  // if (http.GET() == 200) {
  //   String payload = http.getString();
  //   DynamicJsonDocument doc(1024);
  //   deserializeJson(doc, payload);
  //   float remote = doc["current"]["temperature_2m"];
  //   Serial.printf("Remote: %.1fC\n", remote);
  // }
  // http.end();
  // WiFi.disconnect(true);

  delay(2000);
}
