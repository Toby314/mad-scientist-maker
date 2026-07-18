// WHY: Teaches analog thresholds and turning a raw number into a decision.
// A soil-moisture module outputs a voltage on its AO pin: drier soil -> higher
// reading. We pick a threshold and print DRY/OK so you learn how sensors become
// "alerts" in real projects (like a thirsty-plant reminder).

const int MOIST_PIN = 34;        // moisture module AO (analog)
const int DRY_THRESHOLD = 1500;  // raw value above this = soil is too dry

void setup() {
  Serial.begin(115200);
  Serial.println("raw,status");
}

void loop() {
  int raw = analogRead(MOIST_PIN);   // 0..4095 (dryer soil reads higher)

  if (raw < DRY_THRESHOLD) {
    Serial.print(raw);
    Serial.println(", OK   (soil wet enough)");
  } else {
    Serial.print(raw);
    Serial.println(", DRY  (needs water!)");
  }

  delay(1000);   // check once per second
}
