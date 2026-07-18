// WHY: Teaches digital input/output and the INPUT_PULLUP trick.
// A button wired to GND with no resistor reads HIGH when open and LOW when
// pressed. We mirror that state onto an LED so beginners see cause -> effect
// instantly, and learn that Serial is how the chip "talks back".

const int LED_PIN  = 2;   // external LED + 220Ω (or built-in on dev board)
const int BTN_PIN  = 4;   // button: one side -> GPIO4, other side -> GND

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  // INPUT_PULLUP: internal resistor pulls the pin HIGH. Pressing the button
  // shorts it to GND, so a press reads LOW (inverted from intuition!).
  pinMode(BTN_PIN, INPUT_PULLUP);
}

void loop() {
  // Read the (inverted) button: pressed -> LOW -> turn LED ON.
  bool pressed = digitalRead(BTN_PIN) == LOW;

  if (pressed) {
    digitalWrite(LED_PIN, HIGH);
    Serial.println("Button PRESSED -> LED ON");
  } else {
    digitalWrite(LED_PIN, LOW);
    Serial.println("Button released -> LED OFF");
  }
  delay(150);  // small debounce so the log is readable
}
