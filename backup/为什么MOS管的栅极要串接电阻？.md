在开关电路、驱动电路中，MOS管的栅极经常会串联一个电阻。那这个电阻到底有什么用？
![image](https://github.com/user-attachments/assets/288eacce-636a-4fc5-9298-592a07439843)
第一是限制驱动电流，防止驱动电流过大，避免驱动芯片会因为驱动能力不足损坏。

上期我们说过MOS管的开启，是对各个电容进行充电，在充电的瞬间电容相当于短路，并且电流 非常大，驱动芯片无法承接这么大的电流，所以这个电阻就起到了一个限流与保护作用。

但电阻阻值不能太大， 太大的话MOS管的导通时间和关断时间会变长，这样开关损耗就会增加了。

第二个就是开头讲的它可以消除MOS管栅极的振荡信号。
![image](https://github.com/user-attachments/assets/f515c291-df4b-4b4d-926d-1f12d31b6e58)
驱动芯片到MOS管的走线存在寄生电感，并且MOS管的内部电机引线也会有电感，此外MOS管的极间是存在寄生电容的，因此MOS管的开关电路就等效于一个LC低通滤波电路。
![image](https://github.com/user-attachments/assets/c3961e5e-f330-4b3d-a214-9daf0627d4ed)
其输出与输入的比值，就是增益。

当增益大于1时，噪声就被放大了。
![image](https://github.com/user-attachments/assets/f42b6e1f-dea9-461e-a4af-4d62b300e683)
它的谐振频率点附近会产生较高的增益，如果没有一个电阻引入，增益就会等于无穷大。

而驱动信号又是频率分量非常丰富的阶跃信号，必定有谐振频率点附近的信号，因此容易产生谐振，继而产生振荡。

电阻的存在就是用来提供一个阻尼，吸收这样的振荡信号，串接电阻的阻值增大，谐振频率点增益就会减小。一般阻值在10Ω左右即可，公式Rg＞2（L/Cgs）^0.5。
![image](https://github.com/user-attachments/assets/fa4c86b5-f638-4587-9c04-5c5033485b88)
那么，电阻的位置应该是在驱动端还是MOS管端呢？

在一些小功率MOS管电路，驱动端还是MOS管端其实都可以。但是对于大功率的MOS管开关电路，由于关断时MOS管容易受到串扰，可能会产生误操作，因此一般放在MOS管端。

这里简单说下：

很多时候我们见到的开关电源与驱动电路，大部分栅极串联电阻是放在MOS管端的。

这时候我们需要考虑到阻抗匹配，需要将信号看作高速信号。

高速信号：信号的上升沿小于6倍的传输延时。
![image](https://github.com/user-attachments/assets/b7badad5-c34a-4967-aa6d-8a1e55b4bd71)
不过一般情况下，栅极走线长度不会超过10cm，驱动电路的上升时间不会很小，因此不需要考虑成高速信号，也就不必放置到靠近源端IC。

那么放置靠近MOS管有什么好处？
![image](https://github.com/user-attachments/assets/b61920d9-4f60-4d1e-a152-a467f764af69)
上图的设置，对MOS管栅极而言，收取的信号并没有太大区别。
这是因为电感和电阻始终串联，如果将其看成一个整体，阻抗就是R+jwL，这对电路而言是完全相同的。
![image](https://github.com/user-attachments/assets/f8663541-fe8c-426d-8877-c42d0c6953ea)



