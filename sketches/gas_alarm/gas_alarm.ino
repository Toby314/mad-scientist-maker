// WHY: MQ-2 needs ~20s to warm its heater before readings are meaningful. We
// then compare the analog gas level to a threshold; if it trips, the buzzer +
// LED alarm LATCHES (stays on) until a reset — a stuck-on alarm is safer than
// one that quietly clears itself.

#define MQ2_PIN 34
#define BUZZER_PIN 15
#define LED_PIN 2

const int THRESHOLD = 1500;        // tune to your sensor/environment
const unsigned long WARMUP_MS = 20000;

bool alarmLatched = false;

void setup() {
  Serial.begin(115200);
  pinMode(MQ2_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("Warming up sensor...");
}

void loop() {
  if (millis() < WARMUP_MS) {
    Serial.printf("warming %ds\n", (WARMUP_MS - millis()) / 1000);
    delay(1000);
    return;
  }

  int g = analogRead(MQ2_PIN);
  if (g > THRESHOLD) alarmLatched = true;

  if (alarmLatched) {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 2000);          // continuous alarm
    Serial.printf("ALARM gas=%d\n", g);
  } else {
    digitalWrite(LED_PIN, LOW);
    noTone(BUZZER_PIN);
  }
  delay(200);
}
