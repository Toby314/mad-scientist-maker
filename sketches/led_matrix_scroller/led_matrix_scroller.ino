// WHY: A MAX7219 LED matrix is just 8 rows of 8 LEDs you paint a column at a
// time. The chip speaks a dead-simple SPI protocol: write an (address, data)
// pair to set one row's 8 bits. We scroll a message by shifting each glyph's
// font columns leftward. This driver is self-contained (no library) so it
// builds on any ESP32 — LedControl is AVR-only and won't compile here.

#include <SPI.h>

#define DIN_PIN 23   // MOSI
#define CLK_PIN 18   // SCK
#define CS_PIN  5    // LOAD / CS

// --- minimal MAX7219 driver ---
void mx_write(uint8_t reg, uint8_t data) {
  digitalWrite(CS_PIN, LOW);
  SPI.transfer(reg);
  SPI.transfer(data);
  digitalWrite(CS_PIN, HIGH);
}
void mx_init() {
  SPI.begin(CLK_PIN, -1, DIN_PIN, CS_PIN);
  pinMode(CS_PIN, OUTPUT);
  mx_write(0x0C, 0x01);   // shutdown -> normal operation
  mx_write(0x0B, 0x07);   // scan all 8 rows
  mx_write(0x09, 0x00);   // no decode (we drive raw segments)
  mx_write(0x0A, 0x08);   // intensity
  mx_write(0x0F, 0x00);   // no display test
  for (uint8_t r = 1; r <= 8; r++) mx_write(r, 0x00);  // clear
}
void mx_setRow(uint8_t r, uint8_t bits) { mx_write(r, bits); }  // row 1..8

const char* MSG = " HELLO ";
// 5x7-ish font (space + A E H L O, enough for "HELLO").
const byte FONT[][5] = {
  /* space */ {0x00,0x00,0x00,0x00,0x00},
  /* A */ {0x7C,0x12,0x12,0x12,0x7C},
  /* E */ {0x7E,0x42,0x4A,0x42,0x42},
  /* H */ {0x7E,0x10,0x10,0x10,0x7E},
  /* L */ {0x7E,0x40,0x40,0x40,0x40},
  /* O */ {0x3C,0x42,0x42,0x42,0x3C},
};
#define CHAR(c) ((c==' ')?0 : (c>='A'&&c<='Z'? (c-'A'+1):0))

void setup() {
  Serial.begin(115200);
  mx_init();
}

void loop() {
  int total = strlen(MSG) * 6;       // 5 cols + 1 space between glyphs
  byte buf[128]; memset(buf, 0, sizeof(buf));
  int col = 0;
  for (int i = 0; i < strlen(MSG); i++) {
    byte c = CHAR(MSG[i]);
    for (int k = 0; k < 5; k++) buf[col + k] = FONT[c][k];
    col += 6;
  }

  for (int s = 0; s < total; s++) {
    for (int r = 0; r < 8; r++) {
      byte row = 0;
      for (int c = 0; c < 8; c++)
        row |= ((buf[s + c] >> (7 - r)) & 1) << (7 - c);
      mx_setRow(r + 1, row);
    }
    delay(120);
  }
}
