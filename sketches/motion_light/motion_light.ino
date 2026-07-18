// WHY: Teaches passive-infrared (PIR) motion sensing and timed outputs.
// A PIR sensor pulls its OUT pin HIGH when it detects movement. We latch the
// LED on for a fixed "on-time" after each trigger, and log every detection —
// the classic "closet light that stays on a few seconds after you leave".

const int LED_PIN = 2;   // external LED + 220Ω
const int PIR_PIN = 5;   // PIR OUT

const unsigned long ON_TIME_MS = 3000;   // stay lit 3s after last trigger
unsigned long lastTrigger = 0;
bool lightOn = false;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(PIR_PIN, INPUT);
}

void loop() {
  if (digitalRead(PIR_PIN) == HIGH) {
    if (!lightOn) {
      Serial.println("Motion detected -> LED ON");
    }
    lastTrigger = millis();   // remember the most recent movement
    lightOn = true;
    digitalWrite(LED_PIN, HIGH);
  }

  // Turn the light off only after ON_TIME_MS with no new motion.
  if (lightOn && (millis() - lastTrigger > ON_TIME_MS)) {
    digitalWrite(LED_PIN, LOW);
    lightOn = false;
    Serial.println("No motion -> LED OFF");
  }
}
