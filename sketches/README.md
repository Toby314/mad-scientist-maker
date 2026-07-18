# Mad Scientist Maker — Arduino Sketches (Phase 3A)

Every project in the catalog has a verified-compiling Arduino/C++ sketch here, so you can
copy-paste it straight into the Arduino IDE and flash it to an ESP32.

## Layout
```
sketches/<project_id>/<project_id>.ino
```
One folder per project, named after the catalog `id`. The web app reads these and shows the
source inside the project detail view with a Copy button.

## Conventions (ALL sketches follow this)
- Target board: **ESP32** (Arduino core). Compiled with `arduino-cli` for `esp32:esp32:esp32`.
- Pin mapping matches the catalog `wiring` array:
  - Default I2C: **SDA = GPIO 21, SCL = GPIO 22** (ESP32).
  - Default SPI (TFT/RFID/LoRa/matrix): **SCK=18, MOSI=23, MISO=19, CS per board**.
  - LED examples use **GPIO 2** (built-in on most dev boards) with a 220Ω resistor.
  - Buttons use **INPUT_PULLUP** — wire button between GPIO and GND, no external resistor.
- Every sketch has a `// ---- WHY / what you learn ----` comment block at the top (matches the
  app's teaching goal: explain *why*, not just *what*).
- Every sketch compiles. Verified by `tools/compile_all.sh` (runs `arduino-cli compile` on each).
- Keep it minimal and readable — a beginner should be able to follow it. Comments teach.
- If a sketch needs a library, include it at the top and use the **minimal** correct API.

## Libraries used (installed via arduino-cli)
- Adafruit SSD1306 + Adafruit GFX (OLED, addr 0x3C)
- Adafruit BME280 + Adafruit Unified Sensor (weather)
- DHT sensor library (DHT11/DHT22)
- MFRC522 (RFID)
- RTClib (DS3231)
- ArduinoJson (weather API parsing)
- LoRa (SX127x)
- Encoder (rotary)
- LovyanGFX (TFT / CYD)
- GxEPD2 (e-ink)
- ESP32Servo (servo)
- LedControl (MAX7219 matrix)
- Wire, SPI, WiFi, BLE are built into the ESP32 core (no install).

## Compile check
```
bash tools/compile_all.sh
```
Prints PASS/FAIL per sketch. All must PASS before a release is committed.
