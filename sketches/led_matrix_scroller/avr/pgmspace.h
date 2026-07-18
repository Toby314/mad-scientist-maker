// ESP32 compatibility shim: LedControl (AVR-era) expects <avr/pgmspace.h>.
// The ESP32 Arduino core ships a functional pgmspace.h at the toolchain root;
// this thin forwarder makes the AVR include resolve on ESP32. (Local to build.)
#include <pgmspace.h>
