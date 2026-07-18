// WHY: Teaches ultrasonic distance measurement with pulseIn().
// The HC-SR04 sends a 10µs trigger pulse, then its echo pin stays HIGH for a
// time proportional to the round-trip sound travel. We time that pulse and
// convert microseconds to centimeters using the speed of sound.

const int TRIG_PIN = 5;    // HC-SR04 TRIG
const int ECHO_PIN = 18;   // HC-SR04 ECHO

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

void loop() {
  // Send the 10µs trigger pulse.
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Measure how long ECHO stays HIGH (µs). Timeout 30ms (~5m max).
  long durationUs = pulseIn(ECHO_PIN, HIGH, 30000);
  float cm = durationUs * 0.0343 / 2.0;   // speed of sound / 2 (round trip)

  if (durationUs == 0) {
    Serial.println("Out of range");
  } else {
    Serial.print("Distance: ");
    Serial.print(cm, 1);
    Serial.println(" cm");
  }

  delay(60);   // sensor needs a settle gap between reads
}
