// WHY: A potentiometer makes an analog 0..4095. We scale it to a 0..255 LEDC
// duty (ESP32's real PWM) on the L298N enable pin, and a button flips the
// motor direction by swapping IN1/IN2. This is how you fade and reverse a DC motor.

#define POT_PIN 34
#define IN1 13
#define IN2 12
#define ENA 14
#define BTN_PIN 4

#define LEDC_CH 0

void setup() {
  Serial.begin(115200);
  pinMode(POT_PIN, INPUT);
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(BTN_PIN, INPUT_PULLUP);

  // ESP32 PWM via LEDC (core 3.x API: ledcAttach(pin, freq, resBits), ledcWrite(pin, duty)).
  ledcAttach(ENA, 5000, 8);     // 5kHz, 8-bit on the enable pin

  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);          // forward by default
}

void loop() {
  static bool fwd = true;
  static int lastBtn = HIGH;
  int b = digitalRead(BTN_PIN);
  if (b == LOW && lastBtn == HIGH) {
    fwd = !fwd;
    digitalWrite(IN1, fwd ? HIGH : LOW);
    digitalWrite(IN2, fwd ? LOW : HIGH);
  }
  lastBtn = b;

  int raw = analogRead(POT_PIN);
  int duty = map(raw, 0, 4095, 0, 255);
  ledcWrite(ENA, duty);

  Serial.printf("Speed %d  Dir %s\n", duty, fwd ? "FWD" : "REV");
  delay(200);
}
