// WHY: E-ink only uses power while refreshing, so it's perfect for a wall frame
// that shows a quote or status for hours on a coin cell. GxEPD2 paints the
// whole screen in one firstPage()/nextPage() pass, then the display holds the
// image with zero current.

#include <GxEPD2_BW.h>
#include <epd/GxEPD2_213.h>   // panel class (lives in src/epd/ in GxEPD2 1.6.x)
#include <Fonts/FreeMonoBold9pt7b.h>

// 2.13" b/w: BUSY=15, RST=4, DC=2, CS=5
// 1.6.x: the BW template wraps the panel and exposes the Adafruit_GFX draw API.
GxEPD2_BW<GxEPD2_213, GxEPD2_213::HEIGHT> display(GxEPD2_213(5, 2, 4, 15));

void setup() {
  Serial.begin(115200);
  display.init(115200);
  display.setRotation(0);
  display.firstPage();
  do {
    display.setFont(&FreeMonoBold9pt7b);
    display.fillScreen(GxEPD_WHITE);
    display.setTextColor(GxEPD_BLACK);
    display.setCursor(0, 20);
    display.println("Mad Scientist");
    display.println("Maker");
    display.setCursor(0, 70);
    display.println("Keep building.");
  } while (display.nextPage());
  Serial.println("Refreshed. Display holds with no power.");
  // In a real battery build you'd now deep-sleep here.
}

void loop() { /* nothing — image persists with no draw calls */ }
