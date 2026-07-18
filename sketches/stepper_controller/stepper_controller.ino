// WHY: The 28BYJ-48 is a 5V geared stepper; the ULN2003 just switches its 4
// coils. Energizing the right sequence (8 steps) makes it turn. We step forward
// or backward a fixed count each time the button is pressed — no library needed.

#define IN1 13
#define IN2 12
#define IN3 14
#define IN4 27
#define BTN_PIN 4

// Half-step sequence (8 steps) for one electrical revolution.
const int STEP[8][4] = {
  {1,0,0,0},{1,1,0,0},{0,1,0,0},{0,1,1,0},
  {0,0,1,0},{0,0,1,1},{0,0,0,1},{1,0,0,1}
};

void stepMotor(int idx) {
  digitalWrite(IN1, STEP[idx][0]);
  digitalWrite(IN2, STEP[idx][1]);
  digitalWrite(IN3, STEP[idx][2]);
  digitalWrite(IN4, STEP[idx][3]);
}

void setup() {
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(BTN_PIN, INPUT_PULLUP);
  Serial.begin(115200);
}

void loop() {
  static int step = 0;
  static int lastBtn = HIGH;
  int b = digitalRead(BTN_PIN);
  if (b == LOW && lastBtn == HIGH) {
    // Toggle direction each press; step 200 half-steps ~ one shaft rev.
    static int dir = 1;
    dir = -dir;
    for (int i = 0; i < 200; i++) {
      step = (step + dir + 8) % 8;
      stepMotor(step);
      delay(2);
    }
    // Leave coils off to save power.
    digitalWrite(IN1,0); digitalWrite(IN2,0);
    digitalWrite(IN3,0); digitalWrite(IN4,0);
    Serial.println(dir > 0 ? "CW" : "CCW");
  }
  lastBtn = b;
}
