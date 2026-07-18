// WHY: Teaches reading a potentiometer and visualizing it two ways at once.
// We print the raw 12-bit ADC value (0..4095) to Serial, and ALSO map it to LED
// brightness via LEDC — so you see the number and the physical effect together.

const int POT_PIN = 34;    // potentiometer wiper (ends to 3.3V and GND)
const int LED_PIN = 2;     // external LED + 220Ω

const int LEDC_FREQ = 5000;
const int LEDC_RES  = 8;

void setup() {
  Serial.begin(115200);
  // Core 3.x LEDC API: ledcAttach(pin, freq, resolution); ledcWrite(pin, duty).
  ledcAttach(LED_PIN, LEDC_FREQ, LEDC_RES);
  Serial.println("raw,led_duty");
}

void loop() {
  int raw  = analogRead(POT_PIN);          // 0..4095
  int duty = map(raw, 0, 4095, 0, 255);    // 0..255 for the LED
  ledcWrite(LED_PIN, duty);

  Serial.print(raw);
  Serial.print(", ");
  Serial.println(duty);

  delay(500);   // report twice per second
}
