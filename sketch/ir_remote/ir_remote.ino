#include <IRremote.hpp>

#define IR_SEND_PIN 7

uint8_t command = 0;

void setup()
{
  Serial.begin(9600);
  IrSender.begin(IR_SEND_PIN, ENABLE_LED_FEEDBACK);
}

void loop() {
  if (Serial.available() > 0) {
    command = Serial.read();
    IrSender.sendNEC(0x22, command, 5);
  }
}
