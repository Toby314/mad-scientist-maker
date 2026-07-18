// ESP32 compatibility shim: LedControl (AVR-era) includes <WProgram.h>, which
// does not exist on ESP32. Arduino.h provides the same API surface, so we
// forward it. (Local to build.)
#include <Arduino.h>
