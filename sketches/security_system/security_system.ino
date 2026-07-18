// WHY: An RFID-armed motion alarm for a workshop, locker, or lab. A whitelisted
//      card arms/disarms the system; once ARMED, a PIR trip sounds the buzzer and
//      prints ALARM until the same authorized card is presented again.
//      NOTE: pin plan lists PIR=5 and MFRC522 SS=5; move PIR to another free GPIO
//      on real hardware to avoid the SS conflict.

#include <SPI.h>
#include <MFRC522.h>

// MFRC522 (ESP32): SDA=5, RST=27 ; SPI bus 18/23/19 (default VSPI)
#define RST_PIN 27
#define SS_PIN 5
// PIR motion sensor (active HIGH on motion)
#define PIR_PIN 5
// Active buzzer
#define BUZZER_PIN 15

MFRC522 rfid(SS_PIN, RST_PIN);

enum State { DISARMED, ARMED, ALARM };
State state = DISARMED;

// Authorized card UID(s) — replace with the bytes printed when you scan your card
const byte allowedUID[][4] = {
  {0xDE, 0xAD, 0xBE, 0xEF},
  {0x12, 0x34, 0x56, 0x78}
};
const int allowedCount = 2;

bool uidMatches(byte* uid, const byte* allowed) {
  return uid[0] == allowed[0] && uid[1] == allowed[1] &&
         uid[2] == allowed[2] && uid[3] == allowed[3];
}

bool isAuthorized(MFRC522::Uid* uid) {
  for (int i = 0; i < allowedCount; i++) {
    if (uidMatches(uid->uidByte, allowedUID[i])) return true;
  }
  return false;
}

void handleCard() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  if (isAuthorized(&rfid.uid)) {
    if (state == DISARMED) {
      state = ARMED;
      Serial.println("ARMED — system watching for motion");
    } else if (state == ARMED) {
      state = DISARMED;
      noTone(BUZZER_PIN);
      Serial.println("DISARMED");
    } else if (state == ALARM) {
      state = DISARMED;
      noTone(BUZZER_PIN);
      Serial.println("ALARM CLEARED -> DISARMED");
    }
  } else {
    Serial.println("Unauthorized card — ignored");
  }
  rfid.PICC_HaltA();
}

void setup() {
  Serial.begin(115200);
  SPI.begin(); // SCK=18, MISO=19, MOSI=23 on ESP32 VSPI
  rfid.PCD_Init();

  pinMode(PIR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  noTone(BUZZER_PIN);

  Serial.println("Security system ready. Scan an authorized card to ARM.");
}

void loop() {
  handleCard();

  if (state == ARMED) {
    if (digitalRead(PIR_PIN) == HIGH) {
      state = ALARM;
      Serial.println("MOTION DETECTED -> ALARM");
    }
  }

  if (state == ALARM) {
    tone(BUZZER_PIN, 1000);
    Serial.println("ALARM! Present an authorized card to stop.");
  }

  delay(200);
}
