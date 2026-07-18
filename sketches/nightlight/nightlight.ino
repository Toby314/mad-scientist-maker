// WHY: Teaches inverted control: dark should mean brighter.
// An LDR (light-dependent resistor) forms a voltage divider; brighter light ->
// lower ADC reading. We map the reading and INVERT it so the LED brightens as
// the room darkens — the heart of an automatic night-light.

const int LED_PIN = 2;     // external LED + 220Ω
const int LDR_PIN = 34;    // LDR voltage-divider midpoint -> ADC

const int LEDC_FREQ = 5000;
const int LEDC_RES  = 8;

void setup() {
  Serial.begin(115200);
  // Core 3.x LEDC API: ledcAttach(pin, freq, resolution); ledcWrite(pin, duty).
  ledcAttach(LED_PIN, LEDC_FREQ, LEDC_RES);
}

void loop() {
  int raw = analogRead(LDR_PIN);              // 0..4095 (bright->low)
  // Invert: dark (low raw) -> high duty (bright LED).
  int duty = map(raw, 0, 4095, 255, 0);
  duty = constrain(duty, 0, 255);
  ledcWrite(LED_PIN, duty);

  Serial.print("Light level (raw): ");
  Serial.println(raw);
  delay(100);
}
