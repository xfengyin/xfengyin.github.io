---
title: "ESP32 MicroPython 开发入门"
date: 2024-07-17 14:00:00 +0800
categories: [嵌入式开发, ESP32]
tags: [esp32, micropython, 物联网, 嵌入式]
---

## 什么是 MicroPython？

MicroPython 是 Python 3 编程语言的精简高效实现，专门针对微控制器和受限环境设计。它包含了 Python 标准库的一个子集，并提供了访问底层硬件的模块。

## ESP32 简介

ESP32 是乐鑫科技推出的一款低功耗、高集成度的 Wi-Fi + 蓝牙双模芯片，广泛应用于物联网设备开发。

### ESP32 主要特性

- **双核处理器**: Xtensa LX6 双核，主频高达 240MHz
- **内存**: 520KB SRAM
- **无线连接**: 802.11 b/g/n Wi-Fi + 蓝牙 4.2/BLE
- **外设接口**: GPIO、ADC、DAC、SPI、I2C、UART、PWM 等
- **功耗**: 支持多种低功耗模式

## 环境搭建

### 1. 硬件准备

- ESP32 开发板（推荐 ESP32-DevKitC）
- USB 数据线
- 电脑（Windows/macOS/Linux）

### 2. 安装驱动

根据开发板使用的 USB 转串口芯片安装相应驱动：

- **CP2102**: [Silicon Labs 驱动](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers)
- **CH340**: [沁恒微电子驱动](http://www.wch.cn/downloads/CH341SER_ZIP.html)

### 3. 烧录 MicroPython 固件

#### 使用 esptool 工具

```bash
# 安装 esptool
pip install esptool

# 擦除闪存
esptool.py --port /dev/ttyUSB0 erase_flash

# 烧录固件（替换为实际固件文件）
esptool.py --port /dev/ttyUSB0 --baud 460800 write_flash -z 0x1000 esp32-20210902-v1.17.bin
```

#### Windows 使用 Thonny IDE（推荐初学者）

1. 下载安装 [Thonny IDE](https://thonny.org/)
2. 工具 → 设置 → 解释器 → MicroPython (ESP32)
3. 选择端口，点击安装或更新固件

## 基础编程

### 连接 Wi-Fi

```python
import network
import time

# 创建 WLAN 对象
wlan = network.WLAN(network.STA_IF)
wlan.active(True)

# 连接到 Wi-Fi
wlan.connect('你的WiFi名称', '你的WiFi密码')

# 等待连接
while not wlan.isconnected():
    time.sleep(1)
    print('连接中...')

print('已连接:', wlan.ifconfig())
```

### GPIO 控制 LED

```python
from machine import Pin
import time

# 设置 GPIO2 为输出（大多数 ESP32 开发板的板载 LED）
led = Pin(2, Pin.OUT)

# 闪烁 LED
while True:
    led.value(1)  # 点亮
    time.sleep(0.5)
    led.value(0)  # 熄灭
    time.sleep(0.5)
```

### PWM 调光

```python
from machine import Pin, PWM
import time

# 创建 PWM 对象
led_pwm = PWM(Pin(2))
led_pwm.freq(1000)  # 设置频率 1kHz

# 渐变效果
while True:
    # 渐亮
    for duty in range(0, 1024, 10):
        led_pwm.duty(duty)
        time.sleep(0.01)
    
    # 渐暗
    for duty in range(1023, -1, -10):
        led_pwm.duty(duty)
        time.sleep(0.01)
```

### ADC 读取模拟信号

```python
from machine import ADC, Pin
import time

# 创建 ADC 对象
adc = ADC(Pin(34))
adc.atten(ADC.ATTN_11DB)  # 设置衰减，全量程 0-3.3V
adc.width(ADC.WIDTH_12BIT)  # 12位分辨率 (0-4095)

while True:
    value = adc.read()
    voltage = value / 4095 * 3.3
    print(f'ADC值: {value}, 电压: {voltage:.2f}V')
    time.sleep(1)
```

## 进阶应用

### Web 服务器

```python
import network
import socket
from machine import Pin

# 连接 Wi-Fi（代码同上）...

# 创建 Web 服务器
def web_server():
    addr = socket.getaddrinfo('0.0.0.0', 80)[0][-1]
    s = socket.socket()
    s.bind(addr)
    s.listen(1)
    print('Web 服务器运行在:', addr)
    
    led = Pin(2, Pin.OUT)
    
    while True:
        cl, addr = s.accept()
        print('客户端连接:', addr)
        request = cl.recv(1024).decode()
        
        # 解析请求
        if 'GET /?led=on' in request:
            led.value(1)
        elif 'GET /?led=off' in request:
            led.value(0)
        
        # 发送响应
        response = """HTTP/1.0 200 OK\r\nContent-type: text/html\r\n\r\n
        <html>
        <head><title>ESP32 Web Server</title></head>
        <body>
        <h1>ESP32 Web Server</h1>
        <p>LED 控制:</p>
        <a href="/?led=on"><button>ON</button></a>
        <a href="/?led=off"><button>OFF</button></a>
        </body>
        </html>"""
        
        cl.send(response.encode())
        cl.close()

web_server()
```

## 开发工具推荐

| 工具 | 特点 | 适用场景 |
|------|------|---------|
| **Thonny** | 简单易用，内置固件烧录 | 初学者 |
| **VS Code + Pymakr** | 功能强大，代码补全 | 专业开发 |
| **uPyCraft** | 国产工具，中文界面 | 中文用户 |
| **ampy** | 命令行工具，轻量 | 自动化脚本 |

## 常见问题

### 1. 烧录失败

- 按住 BOOT 键再点击烧录
- 降低波特率重试
- 检查 USB 驱动是否正确安装

### 2. 无法连接 Wi-Fi

- 检查 Wi-Fi 名称和密码是否正确
- 确认 Wi-Fi 是 2.4GHz 频段（ESP32 不支持 5GHz）
- 尝试重启开发板

### 3. 内存不足

- 使用 `gc.collect()` 手动回收内存
- 优化代码，避免创建大对象
- 考虑使用 ESP32-S3 等内存更大的型号

## 学习资源

- [MicroPython 官方文档](https://docs.micropython.org/)
- [ESP32 MicroPython 教程](https://docs.espressif.com/projects/esp-idf/)
- [随机波动教程](https://randomnerdtutorials.com/)

---

*最后更新: 2024-07-17*