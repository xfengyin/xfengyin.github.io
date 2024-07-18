# ESP32嵌入式

## ESP32 + OLED（SSD1309）

### SSD1309使用 I2C 进行通信，使用 pin 脚为 SCL： Pin22 ， SDA：Pin21

![image](https://github.com/user-attachments/assets/8b35b30d-a6da-4c4a-9fa2-30b9063f229a)

```python
from machine import Pin, I2C
import ssd1306

# ESP32 Pin assignment 
i2c = I2C(0, scl=Pin(22), sda=Pin(21))

oled_width = 128
oled_height = 64
oled = ssd1306.SSD1306_I2C(oled_width, oled_height, i2c)

oled.text('Hello, Wokwi!', 10, 10)   
oled.show()
```

## ESP32 + Ring Rainbow

###  Neopixels 使用 neopixels 单线通信，使用 pin 脚为 DIN： Pin15 ， DOUT：NC

![image](https://github.com/user-attachments/assets/e8a2524e-1665-46e2-bf8c-9978f1007cb5)

```python
# NeoPixels Rainbow on MicroPython
# Wokwi Example https://wokwi.com/arduino/projects/305569065545499202

from machine import Pin
from neopixel import NeoPixel
from time import sleep

rainbow = [
  (126 , 1 , 0),(114 , 13 , 0),(102 , 25 , 0),(90 , 37 , 0),(78 , 49 , 0),(66 , 61 , 0),(54 , 73 , 0),(42 , 85 , 0),
  (30 , 97 , 0),(18 , 109 , 0),(6 , 121 , 0),(0 , 122 , 5),(0 , 110 , 17),(0 , 98 , 29),(0 , 86 , 41),(0 , 74 , 53),
  (0 , 62 , 65),(0 , 50 , 77),(0 , 38 , 89),(0 , 26 , 101),(0 , 14 , 113),(0 , 2 , 125),(9 , 0 , 118),(21 , 0 , 106),
  (33 , 0 , 94),(45 , 0 , 82),(57 , 0 , 70),(69 , 0 , 58),(81 , 0 , 46),(93 , 0 , 34),(105 , 0 , 22),(117 , 0 , 10)]

pixels = NeoPixel(Pin(15), 16)
while True:
  rainbow = rainbow[-1:] + rainbow[:-1]
  for i in range(16):
    pixels[i] = rainbow[i]
  pixels.write()
  sleep(0.05)
```

## ESP32 + RGB LED

###  RGB LED，使用 pin 脚为 R： Pin16 ，G： Pin18，B： Pin20

![image](https://github.com/user-attachments/assets/0850eea5-0377-40d3-a866-30e97caa41f4)

```python
from machine  import Pin
import utime

red = Pin(16, Pin.OUT)
green = Pin(18, Pin.OUT)
blue = Pin(20, Pin.OUT)

while True:
  red.value(0)
  green.value(1)
  blue.value(1)
  utime.sleep(1)
  red.value(1)
  green.value(0)
  blue.value(1)
  utime.sleep(1)
  red.value(1)
  green.value(1)
  blue.value(0)
  utime.sleep(1)
```