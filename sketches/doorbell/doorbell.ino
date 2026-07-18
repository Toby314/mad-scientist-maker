// WHY: Teaches edge detection (press vs. hold) and making sound with tone().
// We watch for the moment the button goes from released to pressed (a falling
// edge, because of INPUT_PULLUP), then play a friendly two-note chime. This is
// the pattern behind doorbells, key-click feedback, and UI beeps.

const int BTN_PIN   = 4;    // button -> GPIO4 -> GND (INPUT_PULLUP)
const int BUZZER_PIN = 15;  // buzzer + via 100Ω -> GPIO15, - -> GND

bool wasPressed = false;

void setup() {
  Serial.begin(115200);
  pinMode(BTN_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
}

void loop() {
  bool pressed = digitalRead(BTN_PIN) == LOW;

  // Trigger only on the transition release -> press (falling edge).
  if (pressed && !wasPressed) {
    Serial.println("Ding-dong!");
    tone(BUZZER_PIN, 660, 200);   // note 1: E5 for 200ms
    delay(220);
    tone(BUZZER_PIN, 880, 300);   // note 2: A5 for 300ms
    delay(320);
    noTone(BUZZER_PIN);
  }

  wasPressed = pressed;
  delay(20);
}
