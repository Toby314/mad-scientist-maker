// WHY: BLE lets a phone read a sensor with no app pairing dance. We run a GATT
// server with one temperature characteristic and NOTIFY the phone whenever the
// BME280 reading changes — the standard ESP32 BLE temp-notify pattern.

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Wire.h>
#include <Adafruit_BME280.h>

#define SDA_PIN 21
#define SCL_PIN 22

Adafruit_BME280 bme;
BLEServer* pServer = NULL;
BLECharacteristic* pTemp = NULL;
bool deviceConnected = false;

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

class MyCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* p) { deviceConnected = true; }
  void onDisconnect(BLEServer* p) { deviceConnected = false; }
};

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  bme.begin(0x76);

  BLEDevice::init("MadScientistTemp");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);
  pTemp = pService->createCharacteristic(
      CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  pTemp->addDescriptor(new BLE2902());
  pService->start();

  BLEAdvertising* pAdv = pServer->getAdvertising();
  pAdv->start();
  Serial.println("BLE advertising");
}

void loop() {
  if (deviceConnected) {
    float t = bme.readTemperature();
    pTemp->setValue((uint8_t*)&t, sizeof(t));
    pTemp->notify();
    Serial.printf("Notify temp %.1fC\n", t);
    delay(2000);
  }
}
