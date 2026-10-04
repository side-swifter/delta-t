#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <esp_system.h>
// Powered DS18B20: VDD=3.3V, GND=GND, DQ=GPIO4; 4.7k pull-up DQ->3.3V.
OneWire wire(4);
DallasTemperature sensors(&wire);
DeviceAddress address;
bool found = false;
uint32_t bootId, sequence = 0, requestedAt;
void setup() {
  Serial.begin(115200);
  bootId = esp_random();
  sensors.begin();
  found = sensors.getAddress(address, 0);
  if (found) sensors.setResolution(address, 12);
  sensors.setWaitForConversion(false);
  sensors.requestTemperatures();
  requestedAt = millis();
}
void loop() {
  uint32_t now = millis();
  if ((uint32_t)(now - requestedAt) < 1000) return;
  // Conversion has had >=1000ms (12-bit conversion needs up to 750ms).
  float t = found ? sensors.getTempC(address) : DEVICE_DISCONNECTED_C;
  bool valid = found && t != DEVICE_DISCONNECTED_C && isfinite(t) && t >= -55 && t <= 125;
  Serial.printf("{\"schema_version\":1,\"device_id\":\"esp32-01\",\"boot_id\":\"%08lx\",\"seq\":%lu,\"uptime_ms\":%lu,\"sensor_ok\":%s,\"temp_probe_1_c\":", (unsigned long)bootId, (unsigned long)sequence++, (unsigned long)now, valid ? "true" : "false");
  if (valid) Serial.print(t, 4); else Serial.print("null");
  Serial.println("}");
  sensors.requestTemperatures();
  requestedAt = now;
}
