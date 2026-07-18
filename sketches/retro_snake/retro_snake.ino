// WHY: Snake teaches arrays, game loops, and collision in 60 lines. The snake
// is a ring of (x,y) cells on an 8x8 logical grid drawn scaled-up on the OLED.
// Button changes direction; food grows you; wall or self resets the game.

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SDA_PIN 21
#define SCL_PIN 22
#define BTN_PIN 4

Adafruit_SSD1306 display(128, 64, &Wire, -1);

const int GRID = 8, CELL = 8;          // 8x8 grid, 8px cells
int snakeX[32], snakeY[32];
int len = 3, head = 0;
int dirX = 1, dirY = 0;                // moving right
int foodX, foodY;
bool dead = false;
int lastBtn = HIGH;

void placeFood() {
  foodX = random(GRID); foodY = random(GRID);
}

void resetGame() {
  len = 3; head = 0;
  for (int i = 0; i < len; i++) { snakeX[i] = 3 - i; snakeY[i] = 0; }
  dirX = 1; dirY = 0; dead = false;
  placeFood();
}

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  pinMode(BTN_PIN, INPUT_PULLUP);
  randomSeed(analogRead(34));
  resetGame();
}

void loop() {
  int b = digitalRead(BTN_PIN);
  if (b == LOW && lastBtn == HIGH) {
    // Rotate direction: right->down->left->up->right
    int t = dirX; dirX = -dirY; dirY = t;
  }
  lastBtn = b;

  if (!dead) {
    int nx = snakeX[head] + dirX;
    int ny = snakeY[head] + dirY;
    if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) { dead = true; }
    else {
      for (int i = 0; i < len; i++)
        if (snakeX[i] == nx && snakeY[i] == ny) dead = true;
    }
    if (!dead) {
      int nh = (head + 1) % 32;
      if (len < 32) len++;
      snakeX[nh] = nx; snakeY[nh] = ny; head = nh;
      if (nx == foodX && ny == foodY) placeFood();
    }
  } else if (b == LOW) resetGame();

  display.clearDisplay();
  for (int i = 0; i < len; i++)
    display.fillRect(snakeX[i] * CELL, snakeY[i] * CELL, CELL, CELL, SSD1306_WHITE);
  display.drawRect(foodX * CELL, foodY * CELL, CELL, CELL, SSD1306_WHITE);
  if (dead) { display.setCursor(0, 56); display.print("DEAD - press"); }
  display.display();
  delay(250);
}
