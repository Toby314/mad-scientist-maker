// WHY: Teaches analog input and PWM brightness control on ESP32.
// A potentiometer gives a voltage the ESP32 reads as a 12-bit number (0..4095).
// ESP32 has NO analogWrite(); instead we use the LEDC peripheral. Mapping the
// knob range to an 8-bit duty (0..255) lets you fade an LED smoothly — great
// for Serial Plotter visuals.

const int LED_PIN = 2;     // external LED + 220Ω
const int POT_PIN = 34;    // potentiometer wiper (ends to 3.3V and GND)

const int LEDC_FREQ = 5000;
const int LEDC_RES  = 8;    // 8-bit resolution -> duty 0..255

void setup() {
  Serial.begin(115200);
  // ESP32 PWM setup (DO NOT use analogWrite on ESP32).
  // Core 3.x API: ledcAttach(pin, freq, resolution) replaces the old
  // ledcSetup()+ledcAttachPin() pair; ledcWrite() then takes the pin directly.
  ledcAttach(LED_PIN, LEDC_FREQ, LEDC_RES);
}

void loop() {
  int raw = analogRead(POT_PIN);           // 0..4095
  int duty = map(raw, 0, 4095, 0, 255);    // scale to 0..255
  ledcWrite(LED_PIN, duty);                // set LED brightness

  Serial.println(duty);                    // plot-friendly single value
  delay(50);
}
