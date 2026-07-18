// WHY: RFID is just "who is this card?" If the UID is on an allowlist we actuate
// a relay (the electric strike / lock) for 2s and beep success; otherwise we
// silently ignore. Keep the allowlist in flash — no server required.

#include <SPI.h>
#include <MFRC522.h>

#define RST_PIN 27
#define SS_PIN 5
#define RELAY_PIN 12
#define BUZZER_PIN 15

MFRC522 rfid(SS_PIN, RST_PIN);

// Allowlist of accepted UIDs (4-byte examples — edit to your cards).
byte allowed[][4] = {
  {0xDE, 0xAD, 0xBE, 0xEF},
  {0x12, 0x34, 0x56, 0x78}
};
const int ALLOWED_N = 2;

bool uidMatches(byte* uid, byte len) {
  for (int i = 0; i < ALLOWED_N; i++) {
    bool ok = true;
    for (int j = 0; j < len; j++) if (uid[j] != allowed[i][j]) ok = false;
    if (ok) return true;
  }
  return false;
}

void unlock() {
  digitalWrite(RELAY_PIN, HIGH);          // energize lock/strike
  tone(BUZZER_PIN, 1000, 150);
  delay(2000);
  digitalWrite(RELAY_PIN, LOW);
  noTone(BUZZER_PIN);
}

void setup() {
  Serial.begin(115200);
  SPI.begin(18, 19, 23, 5);
  rfid.PCD_Init();
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
}

void loop() {
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    if (uidMatches(rfid.uid.uidByte, rfid.uid.size)) {
      Serial.println("Access granted");
      unlock();
    } else {
      Serial.println("Access denied");
    }
    rfid.PICC_HaltA();
  }
}
