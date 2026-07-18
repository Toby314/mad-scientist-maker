// WHY: Teaches sequencing tones into a melody with data-driven code.
// Instead of hard-coding each note, we store {frequency, duration} pairs in an
// array and loop through them. This shows how tables of data drive behavior —
// easy to edit into your own tune.

const int BUZZER_PIN = 15;   // buzzer + via 100Ω -> GPIO15, - -> GND

// { frequency Hz, duration ms }  (0 Hz = rest)
struct Note { int freq; int ms; };
Note melody[] = {
  {262, 300},   // C4
  {330, 300},   // E4
  {392, 300},   // G4
  {523, 500},   // C5
  {0,   200},   // rest
  {392, 300},   // G4
  {330, 500},   // E4
};
const int N_NOTES = sizeof(melody) / sizeof(melody[0]);

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
}

void loop() {
  Serial.println("Playing melody...");
  for (int i = 0; i < N_NOTES; i++) {
    if (melody[i].freq > 0) {
      tone(BUZZER_PIN, melody[i].freq, melody[i].ms);
    }
    delay(melody[i].ms);          // let the note sound
    noTone(BUZZER_PIN);           // silence between notes
    delay(40);                    // tiny gap
  }
  Serial.println("Done.");
  delay(2000);                    // pause before repeating
}
