// WHY: The CYD (Cheap Yellow Display) is an ESP32 + ILI9341 TFT in one board.
// LovyanGFX drives it over SPI. We draw labels plus a live value (here an
// animated counter — swap for a sensor read) and a horizontal bar.

#include <LovyanGFX.hpp>

class LGFX : public lgfx::LGFX_Device {
  lgfx::Panel_ILI9341 _panel; lgfx::Bus_SPI _bus;
 public:
  LGFX(void) {
    auto cfg = _bus.config();
    cfg.spi_host = VSPI_HOST; cfg.spi_mode = 0; cfg.freq_write = 40000000; cfg.freq_read = 16000000;
    cfg.pin_sclk = 18; cfg.pin_mosi = 23; cfg.pin_miso = -1; cfg.pin_dc = 2;
    _bus.config(cfg); _panel.setBus(&_bus);
    auto p = _panel.config(); p.pin_cs = 5; p.pin_rst = 4; p.offset_rotation = 0;
    _panel.config(p); setPanel(&_panel);
  }
};

static LGFX lcd;

#define POT_PIN 34

void setup() {
  Serial.begin(115200);
  lcd.init();
  lcd.setRotation(0);
  lcd.fillScreen(0);
  lcd.setTextColor(0xFFFF);
  pinMode(POT_PIN, INPUT);
}

void loop() {
  int v = analogRead(POT_PIN);             // 0..4095
  int barW = map(v, 0, 4095, 0, lcd.width() - 20);

  lcd.fillScreen(0);
  lcd.setCursor(10, 20);
  lcd.println("TFT Dashboard");
  lcd.setCursor(10, 50);
  lcd.printf("Value: %d", v);

  lcd.drawRect(10, 80, lcd.width() - 20, 20, 0xFFFF);
  lcd.fillRect(11, 81, barW, 18, 0x07E0);   // green bar
  delay(100);
}
