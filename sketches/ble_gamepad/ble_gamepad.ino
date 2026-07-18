// WHY: Turn the ESP32 into a wireless BLE HID gamepad so a maker can control
//      PC/phone apps without wires. GPIO4 + the encoder switch (GPIO25) are the
//      two action buttons; the rotary encoder on GPIO32/33 (A/B) drives the X axis
//      for scrolling/turning. Uses the built-in BLEHIDDevice HID profile with a
//      custom 2-button + 4-axis gamepad report descriptor.

#include <BLEDevice.h>
#include <BLEHIDDevice.h>
#include <BLECharacteristic.h>

// Pin plan
#define BTN1_PIN 4   // action button 1
#define BTN2_PIN 25  // action button 2 (encoder switch)
#define ENC_A_PIN 32 // encoder A
#define ENC_B_PIN 33 // encoder B

BLEHIDDevice* hid = nullptr;
BLECharacteristic* inputReportChar = nullptr;

// HID Report Descriptor (Report ID 1): 2 buttons (bitmap) + 4 signed 8-bit axes.
// This core's BLEHIDDevice exposes no gamepad() helper, so we supply the descriptor
// and push reports through inputReport(1).
static const uint8_t hidReportDescriptor[] = {
  0x05, 0x01,        // Usage Page (Generic Desktop)
  0x09, 0x05,        // Usage (Game Pad)
  0xA1, 0x01,        // Collection (Application)
  0x85, 0x01,        //   Report ID (1)
  0x05, 0x09,        //   Usage Page (Button)
  0x19, 0x01,        //   Usage Minimum (Button 1)
  0x29, 0x02,        //   Usage Maximum (Button 2)
  0x15, 0x00,        //   Logical Minimum (0)
  0x25, 0x01,        //   Logical Maximum (1)
  0x95, 0x02,        //   Report Count (2)
  0x75, 0x01,        //   Report Size (1)
  0x81, 0x02,        //   Input (Data,Var,Abs)
  0x95, 0x01,        //   Report Count (1)
  0x75, 0x06,        //   Report Size (6) -> padding to byte boundary
  0x81, 0x03,        //   Input (Const,Var,Abs)
  0x05, 0x01,        //   Usage Page (Generic Desktop)
  0x09, 0x30,        //   Usage (X)
  0x09, 0x31,        //   Usage (Y)
  0x09, 0x32,        //   Usage (Z)
  0x09, 0x35,        //   Usage (Rz)
  0x15, 0x81,        //   Logical Minimum (-127)
  0x25, 0x7F,        //   Logical Maximum (127)
  0x75, 0x08,        //   Report Size (8)
  0x95, 0x04,        //   Report Count (4)
  0x81, 0x02,        //   Input (Data,Var,Abs)
  0xC0               // End Collection
};

// report[0] = buttons (bit0,bit1); report[1..4] = X,Y,Z,Rz axes
static uint8_t report[5] = {0};

static int encA = 0, encB = 0;
static int8_t axisX = 0;

class GamepadServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    Serial.println("BLE client connected");
  }
  void onDisconnect(BLEServer* pServer) override {
    // Restart advertising so the device can be paired again
    BLEDevice::getAdvertising()->start();
    Serial.println("BLE client disconnected, advertising restarted");
  }
};

void setup() {
  Serial.begin(115200);

  pinMode(BTN1_PIN, INPUT_PULLUP);
  pinMode(BTN2_PIN, INPUT_PULLUP);
  pinMode(ENC_A_PIN, INPUT_PULLUP);
  pinMode(ENC_B_PIN, INPUT_PULLUP);

  BLEDevice::init("MSM Gamepad");
  BLEServer* pServer = BLEDevice::createServer();
  pServer->setCallbacks(new GamepadServerCallbacks());

  hid = new BLEHIDDevice(pServer);
  hid->reportMap((uint8_t*)hidReportDescriptor, sizeof(hidReportDescriptor));
  inputReportChar = hid->inputReport(1); // creates the Report ID 1 input characteristic

  hid->manufacturer()->setValue("MSM");
  hid->pnp(0x01, 0x1234, 0x5678, 0x011);
  hid->startServices();
  hid->setBatteryLevel(100);

  BLEDevice::getAdvertising()->setAppearance(0x03C4); // 0x03C4 = Gamepad
  BLEDevice::getAdvertising()->addServiceUUID(hid->hidService()->getUUID());
  BLEDevice::getAdvertising()->start();

  encA = digitalRead(ENC_A_PIN);
  encB = digitalRead(ENC_B_PIN);

  Serial.println("Gamepad ready — pair with your device");
}

void loop() {
  // --- Buttons (active LOW) ---
  uint8_t buttons = 0;
  if (digitalRead(BTN1_PIN) == LOW) buttons |= (1 << 0);
  if (digitalRead(BTN2_PIN) == LOW) buttons |= (1 << 1);

  // --- Quadrature decode of rotary encoder (1 step per A transition) ---
  int a = digitalRead(ENC_A_PIN);
  int b = digitalRead(ENC_B_PIN);
  if (a != encA) {
    if (b != a) axisX = (int8_t)min((int)127, (int)(axisX + 1));
    else        axisX = (int8_t)max((int)-127, (int)(axisX - 1));
    encA = a;
    encB = b;
  }

  // --- Build and send HID report ---
  report[0] = buttons;        // buttons (bit0 = btn1, bit1 = btn2)
  report[1] = (uint8_t)axisX; // X axis
  report[2] = 0;              // Y axis
  report[3] = 0;              // Z axis
  report[4] = 0;              // Rz axis

  inputReportChar->setValue((uint8_t*)report, sizeof(report));
  inputReportChar->notify();

  delay(20);
}
