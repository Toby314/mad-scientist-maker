// WHY: Teaches motor control and smooth motion with the ESP32Servo library.
// A servo holds an angle (0..180°). ESP32Servo generates the required PWM
// signal on any GPIO — here GPIO13. Sweeping back and forth is the classic
// first step toward robot arms, pan/tilt, and animated props.

#include <ESP32Servo.h>

Servo myServo;
const int SERVO_PIN = 13;   // signal pin

void setup() {
  Serial.begin(115200);
  myServo.attach(SERVO_PIN);   // ESP32Servo handles the PWM timing
  myServo.write(0);
}

void loop() {
  // Sweep 0 -> 180.
  for (int angle = 0; angle <= 180; angle += 5) {
    myServo.write(angle);
    Serial.println(angle);
    delay(15);
  }
  // Sweep 180 -> 0.
  for (int angle = 180; angle >= 0; angle -= 5) {
    myServo.write(angle);
    Serial.println(angle);
    delay(15);
  }
}
