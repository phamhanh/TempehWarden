<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<link rel="stylesheet" type="text/css" href="./help_styles.css">
</head>
<body>
<h2><a id="user-content-overview" class="anchor" href="#overview" aria-hidden="true"><span class="octicon octicon-link"></span></a>Overview</h2>
<p>TempehWarden is an application that runs on the Raspberry Pi
(B, B
Plus, RPi 2 and RPi 3 supported; the Pi Zero is not supported, nor is
the
BeagleBone Black...yet) that monitors and controls temperature and
humidity and
provides a graphical display of these values over time. This is useful
for monitoring wine cellars, kegerators/keezers, humidors, meat
cellars,
refrigerators, etc. for optimal temperature and humidity. If these
values are out of range, TempehWarden can be set to send alarm emails
and text messages to designated users.&nbsp;</p>
<p></p>
<p>TempehWarden now also provides
controllers for controlling temperature and humidity automatically,
useful for maintaining wine cellar temperature and humidity, the
temperature of a kegerator or keezer, or to control the temperature of
multiple wine/beer fermentation vessels. A
virtually unlimited number of controllers can be defined for this
purpose. These controllers may use hysteresis (thermostatic) or PID
temperature automatic control and can be programmed to follow
individual profiles
to vary the setpoint over time.&nbsp;</p>
<p></p>
<p>For temperature and humidity probes,
TempehWarden supports up to two DHT11/DHT22/AM2302 temperature/humidity
sensors connected to RPi GPIO pins. In addition, up to eight
Dallas One-Wire (DS18B20) temperature sensors can be connected to the
RPi and monitored by TempehWarden. As well, up to two door switches
can be monitored to ensure that&nbsp;cellar or fermentation doors
have
not been left open
for too long. Alarm functions can be set to only be activated when a
condition has been met for a set time (as configured in the <a style="color: rgb(51, 255, 51);" href="/public/help/help_alarms.html">Alarms
Configuration dialog</a>). The server daemon is programmed in
Node.js and the
client app is handled by Javascript.&nbsp;</p>
<h2><br>
<a id="user-content-web-app" class="anchor" href="#web-app" aria-hidden="true"><span class="octicon octicon-link"></span></a></h2>
<h2>Web App</h2>
<p><a href="https://github.com/craigmw/TempehWarden/blob/master/public/help/MainSensors.jpg"><img style="border: 0px solid ; width: 1000px; height: 685px;" alt="Cellar Warden Overview" src="/public/help/MainSensors.jpg"></a><a href="https://github.com/craigmw/TempehWarden/blob/master/public/help/MainSensors.jpg" target="_blank"><br>
</a></p>
<p>TempehWarden is a client/server application, with a Node.js
server
running as a service on the RPi perpetually. It continuously logs
temperature and humidity data and stores this to a log file.
TempehWarden now offers controller function to control temperature or
humidity using hysteresis or PID control. A virtually unlimited number
of controllers can be associated with temperature or humidity sensors
to control the output of refrigerators, wine cellars, fermentation
chambers, etc. TempehWarden only requires a Raspberry Pi, and connects
to such appliances via relay boards, with the relay boards driving the
powering of these attached appliances. TempehWarden also provides
controller profiles, a method to vary the setpoint for temperature or
humidity over time. These profiles can be generated using a <a style="color: rgb(51, 255, 51);" href="/public/help/help_profile.html">profile
editor</a>, and can be saved or loaded for re-use.</p>
<p></p>
<p>To
view logged data, or to
change configurations, controllers and alarm settings, a web based
app is used. Shown is the web client application, with temperature and
humidity data plotted over time. Also shown on the graph are
annotations indicating alarm conditions that were triggered. These
conditions can be set in <a style="color: rgb(51, 255, 51);" href="/public/help/help_alarms.html">a dialog</a> opened by
clicking on the Alarms
button. Alarm notifications are sent to specified email addresses,
including those associated with cell phone/SMS accounts. TempehWarden
also compresses older data, as can be configured under the Logging
Option in the <a style="color: rgb(51, 255, 51);" href="/public/help/help_config.html">Configure dialog</a>.
Alternatively, TempehWarden can
maintain data for a set period, deleting older data as time progresses
in round-robbin fashion. These logging options prevent the log file
from becoming too large and slowing down client side operations. Note
that while
not shown above, moving the mouse over the graphs will show the data
values for each plot in legend to the right of the graph. TempehWarden
call also monitor door open events and will plot these on the main
screen. Alarms can be set up to notify the user if doors are left open
too long.</p>
<p></p>
<h2><a id="user-content-hardware-configuration" class="anchor" href="#hardware-configuration" aria-hidden="true"><span class="octicon octicon-link"></span></a>Hardware
Configuration</h2>
<p>The minimal hardware for TempehWarden is a single
<a style="color: rgb(51, 255, 51);" href="https://www.adafruit.com/product/386">DHT11</a>/<a style="color: rgb(51, 255, 51);" href="https://www.adafruit.com/product/385">DHT22</a>/<a style="color: rgb(51, 255, 51);" href="https://www.adafruit.com/products/393">AM2302</a>
combined temp/humidity sensor connected to a free GPIO pin on a
Raspberry Pi B, B Plus or RPi2. As shown in the Fritzing schematic
below, this is done by running the specified GPIO input pin to the data
line on the sensor, with 3.3V and ground supplied to appropriate pins
on the sensor. Note that the DHT22/AM2302 is more accurate than the
DHT11, and thus it is recommended that one of these be employed. These
sensors use a form of one-wire protocol to communicate, although this
is proprietary and is not supported by the Dallas One Wire protocol. </p>
<p>In addition to these, two Dallas One Wire temperature sensors
may
also be configured. In this case, a single GPIO pin is required,
regardless of the number of One Wire sensors (e.g. <a style="color: rgb(51, 255, 51);" href="https://www.adafruit.com/products/374">DS18B20</a>). Each
DHT11/DHT22/AM2302 and the Dallas One Wire bus requires the data line
to be pulled high (3.3V or 5V) via a 4.7K Ohm resistor in series
between Vcc
(3.3V or 5V) and the data line (as shown). Note that the Dallas One
Wire data
line is currently set to use GPIO 4 on the RPiBv2 and RPiB+, as this is
set in Raspbian. However, newer implementations of <a style="color: rgb(51, 255, 51);" href="http://www.raspberrypi.org/documentation/configuration/device-tree.md">Raspbian
use a
Device Tree.</a> Thus it is possible to use a different GPIO pin
for setting up the
Dallas One Wire bus. TempehWarden does not currently change this GPIO
setting, although it stores the GPIO number in its configuration for
reference. </p>
<p>TempehWarden also supports a hardware LCD character display
based on
the Hitachi HD44780U controller. By default, TempehWarden will use a
20x4 single led backlit parallel display such as <a style="color: rgb(51, 255, 51);" href="http://www.amazon.com/RioRand-trade-Module-Arduino-White/dp/B00GZ6GK7A/ref=pd_sim_pc_5?ie=UTF8&amp;refRID=0B8Q9M15C5P73Y20XB67">this</a>.
TempehWarden also supports LCD displays that connect via I2C backpacks,
including this <a style="color: rgb(51, 255, 51);" href="http://www.sainsmart.com/sainsmart-iic-i2c-twi-serial-2004-20x4-lcd-module-shield-for-arduino-uno-mega-r3.html">model</a>.
While I2C displays are slower than parallel displays, only two GPIO
pins are required and these can be shared with other devices, including
&nbsp;<a style="color: rgb(51, 255, 51);" href="https://www.adafruit.com/product/264">I2C realtime
clock (RTC) boards</a>.</p>
<p></p>
<p>In addition, up to two GPIO pins may be specified to monitor
door
opening via microswitches. As shown in the schematic, such a door
switch may also be used to switch on the LCD backlight (if used). Thus,
a simple SPDT microswitch may be used in which the common is connected
to Vcc, and the normally open contact is connected to the backlight pin
on the LCD </p>
<p>Note: TempehWarden uses the GPIO numbers as specified by
Broadcom,
not the actual pin numbers. GPIO numbers can be determined for
different RPi boards <a style="color: rgb(51, 255, 51);" href="http://pi.gadgetoid.com/pinout">here</a>.</p>
<p><a href="http://pi.gadgetoid.com/pinout"><br>
</a></p>
<h2>
<a id="user-content-schematics" class="anchor" href="#schematics" aria-hidden="true"><span class="octicon octicon-link"></span></a>Schematics</h2>
<p><a href="https://github.com/craigmw/TempehWarden/blob/master/public/help/TempehWardenMin_bb.jpg" target="_blank"><img src="https://github.com/craigmw/TempehWarden/raw/master/public/help/TempehWardenMin_bb.jpg" style="max-width: 100%;"></a></p>
<p>This is a relatively minimal setup involving one DHT22 to
measure
the cellar air temperature and humidity, a single DS18B20 One Wire
temperature sensor for measuring bottle temperature (using a
thermowell), and a door microswitch. Note that while some DS18B20
sensors are available wired in a waterproof probe, I prefer to use a
thermowell to simplify insertion of the probe into a wine bottle. Fill
an empty bottle with water, drill a 1/4" hole through the cork and then
insert the thermowell through the hole in the cork. Place the cork
tightly into the bottle and check for leaks. Put the bottle in the
cellar and insert the DS18B20 probe into the thermowell. A good source
for such thermowells is <a style="color: rgb(51, 255, 51);" href="https://www.brewershardware.com/12-Stainless-Steel-Thermowell-TWS12.html">here</a>.</p>
<p>Additional hardware configurations can be found in the <a style="color: rgb(51, 255, 51);" href="help_hardware.html">Hardware
Examples</a> help page.</p>
<p><a href="https://www.brewershardware.com/12-Stainless-Steel-Thermowell-TWS12.html"><br>
</a></p>
<h2><a id="user-content-installation" class="anchor" href="#installation" aria-hidden="true"><span class="octicon octicon-link"></span></a>Installation</h2>
<p>Purchase an RPi B, B+, RPi2 or RPi3 along with an SD Card (8GB+,
Class 10
recommended) and a micro-USB power adapter. A WiFi dongle such as <a style="color: rgb(51, 255, 51);" href="http://www.amazon.com/Edimax-EW-7811Un-150Mbps-Raspberry-Supports/dp/B003MTTJOY">this</a>
is highly recommended (although this is not needed on the RPi3 as this
board has a built-in WiFi chip). A micro-USB charger will also be
needed to provide power to the RPi and any attached peripherals (e.g.
relay boards, LCD displays, sensors, etc); purchase one that puts out
at least 1A (1000 mA) to provide sufficient power.</p>
<p><a href="http://www.amazon.com/Edimax-EW-7811Un-150Mbps-Raspberry-Supports/dp/B003MTTJOY"><br>
</a></p>
<p>Follow the <a style="color: rgb(51, 255, 51);" href="http://www.raspberrypi.org/documentation/installation/installing-images/README.md">instructions</a>
on the Raspberry Pi site to set up the SD
card before booting the RPi for the first time using the latest version
of the Raspbian Wheezy operating system.</p>
<p><a href="http://www.raspberrypi.org/documentation/installation/installing-images/README.md"><br>
</a></p>
<p>After installing the software on the SD card, place this into
the
microSD card slot on the RPi and plug the microUSB power adapter in to
power it up. The RPi can be accessed by connecting a keyboard to one of
the USB ports, as well as a monitor to is HDMI port. However, it is
possible to access the RPi command line shell through an ethernet
connection via SSH (Secure Shell) using <a style="color: rgb(51, 255, 51);" href="http://www.putty.org/">PuTTY</a> (Windows) or the Mac OS X
Terminal. Thus, it is recommended that the RPi be connected by an
ethernet cable into an empty port on a nearby router or switch. More
information about this can be found <a style="color: rgb(51, 255, 51);" href="http://www.raspberrypi.org/documentation/remote-access/ssh/">here</a>.</p>
<p><a href="http://www.raspberrypi.org/documentation/remote-access/ssh/"><br>
</a></p>
<p>Once you have access to the command line, it is recommended
that the
local timezone be set and the filesystem expanded so the RPi has access
to all of the SD card's capacity. This is done by typing at the command
line:</p>
<div class="highlight highlight-bash">
<pre>sudo raspi-config</pre>
</div>
<p>Note: commands and settings shown in the grey boxes can be
copied
here and then pasted into your command line shell. If you are using
PuTTY, right click in the shell, and this will paste the command onto
the command line. Press enter to submit the command. While editing
files in nano, you can do the same. </p>
<p>Also, make sure to change the "pi" user password from
"raspberry" to your own <a style="color: rgb(51, 255, 51);" href="http://www.raspberrypi.org/documentation/linux/usage/users.md">unique
password</a>.</p>
<p><a href="http://www.raspberrypi.org/documentation/linux/usage/users.md"><br>
</a></p>
<p>Update the operating system:</p>
<div class="highlight highlight-bash">
<pre>sudo apt-get update -y <span class="pl-k">&amp;&amp;</span> apt-get upgrade<br>sudo reboot</pre>
</div>
<p></p><p>With the RPi functioning properly, we can now install
TempehWarden. </p>
<p>First, we must install Node.js (Node versions 4.2.1 and 4.4.2
are currently
supported). Note
that recent versions of Raspian Jesse include an older version of
Node.js, and this must be uninstalled in order to run TempehWarden. &nbsp;To determine if node.js is already installed, type:</p><br><div class="highlight highlight-bash">
<pre>node -v<br>npm -v</pre></div><br>If either node.js or npm is installed, use the following commands to remove them so we can install a new copy of node.js:
<br><div class="highlight highlight-bash"><pre>sudo apt-get remove nodejs<br>sudo apt-get remove npm</pre>
</div><br><p>To
install the latest Raspbian version of Node.js, type the following: </p>
<div class="highlight highlight-bash">
<pre>curl -sL https://deb.nodesource.com/setup_4.x | sudo bash -<br>sudo apt-get install -y build-essential python-dev nodejs npm</pre>
</div>
<p>Verify that Node.js is properly installed by typing:</p>
<div class="highlight highlight-bash">
<pre>node -v</pre>
</div>
<p></p>
<p>Install the BCM2835 library (needed for reading the DHT
sensors):</p>
<div class="highlight highlight-bash">
<pre>cd /home/pi<br>wget http://www.airspayce.com/mikem/bcm2835/bcm2835-1.50.tar.gz<br>tar zxvf bcm2835-1.50.tar.gz<br>cd bcm2835-1.50<br>./configure<br>make<br>sudo make check<span style="font-family: Arial,sans-serif;"><br></span>sudo make install</pre>
</div>
<p></p>
<p>To install TempehWarden, type the following:</p>
<div class="highlight highlight-bash">
<pre><span class="pl-s3">cd</span> /home/pi<br>sudo apt-get install git-core<br>git clone https://github.com/craigmw/TempehWarden /home/pi/CellarW<br>cd /home/pi/CellarW<br>npm install</pre>
</div>
<p></p>
<p>To ensure that TempehWarden starts on bootup:</p>
<div class="highlight highlight-bash">
<pre><span class="pl-s3">cd</span> /etc<br>sudo nano rc.<span class="pl-s">local</span></pre>
</div>
<p></p>
<p>Add the following toward the end of rc.local (but before the
"exit 0" line):</p>
<div class="highlight highlight-bash">
<pre><span class="pl-c">#Load TempehWarden on startup<br>cd /home/pi/CellarW<br>su root -c 'node cwdaemon.js'<br></span><span class="pl-s1"><span class="pl-pds"></span></span></pre>
</div>
<p></p>
<p>To save the changes to rc.local, press Ctrl-X, Y and Enter.</p>
<p></p>
<p>If you plan to use Dallas One Wire DS18B20 temperature
sensors,
additional configuration is required. The One Wire bus can be activated
on the RPi by typing:</p>
<div class="highlight highlight-bash">
<pre>sudo modprobe w1-gpio<br>sudo modprobe w1-therm</pre>
</div>
<p></p>
<p>For recent versions of Raspbian Wheezy (and Jessie),
One
Wire devices are handled by the Device Tree. So it will be necessary to
change the configuration in /boot/config.txt. To do so:</p>
<div class="highlight highlight-bash">
<pre><span class="pl-s3">cd</span> /boot<br>sudo nano config.txt</pre>
</div>
<p></p><p>At the bottom of this file, add the following lines:</p>
<div class="highlight highlight-bash">
<pre><span class="pl-c">#For OneWire functionality</span><br>dtoverlay=w1-gpio,gpiopin=4</pre>
</div>
<p></p>
<p>Note that other GPIO pins can be used for the OneWire data
bus, so
changing gpiopin to a different number should accomplish this. To save
the changes to config.txt, press Ctrl-X, Y and Enter.</p>
<p>If you intend to use an I2C-based LCD display or an I2C
connected RTC board, see the <a style="color: rgb(51, 255, 51);" href="/public/help/help_hardware.html">Hardware Examples</a> page
for more details about how to set up and configure these devices.</p>
<p></p>
<p>Now, reboot the RPi by issuing the following command:</p>
<div class="highlight highlight-bash">
<pre>sudo reboot</pre>
</div>
<p></p>
<p>Once the RPi restarts, the TempehWarden server should start
up. This can be checked by logging back into the RPi and typing:</p>
<div class="highlight highlight-bash">
<pre>top</pre>
</div>
<p></p>
<p>Look near the top of the list and you should see node under
the
Command column, indicating that TempehWarden is running in the
background. Also, point your browser to the IP address of your RPi
(which you should know by now if you are using SSH, if not, type
ifconfig at the command line and look at the eth0 IP address listing),
along with the default port address 8888 for the TempehWarden server.
For example, type the following (with your RPi's local IP address) into
the address bar of your browser:</p>
<div class="highlight highlight-bash">
<pre>http://192.168.1.50:8888</pre>
</div>
<p></p>
<p>If successful, this should bring up the TempehWarden web app.
Here
you can configure TempehWarden for the hardware you wish to set up by
clicking on the Configure button on the top right. Make sure to set up
the proper server address (the IP address of the RPi) and port number
(default 8888) so that the web app communicates properly with the
server daemon.&nbsp;</p>
<h2><br>
<a id="user-content-wifi-access" class="anchor" href="#wifi-access" aria-hidden="true"><span class="octicon octicon-link"></span></a></h2>
<h2>WiFi access</h2>
<p>It is unlikely that an ethernet port is located near your wine
cellar or refrigerator. For this reason, it is recommended to use a
WiFi dongle to access your WiFi network. Note that a WiFi dongle is not
necessary if you are using an RPi3, as these have built-in WiFi.&nbsp; <a style="color: rgb(51, 255, 51);" href="http://www.raspberrypi.org/documentation/configuration/wireless/wireless-cli.md">This
information</a> is
useful for setting up WiFi access with typical WiFi dongles that can be
plugged into an open USB port on the RPi.</p>
<p>Sometimes, such WiFi connections are dropped by the RPi. If
you
experience WiFi dropouts, you can use<a style="color: rgb(51, 255, 51);" href="http://weworkweplay.com/play/automatically-connect-a-raspberry-pi-to-a-wifi-network/">
this method</a> to force the
RPi to reconnect to the WiFi network.</p>
<p>Note that the TempehWarden daemon will continue to function,
logging
temperature and humidity, even if the WiFi connection drops. However,
the web app will be unable to connect until the WiFi is re-established.</p>
<h2><br>
<a id="user-content-emailsms-alarms" class="anchor" href="#emailsms-alarms" aria-hidden="true"><span class="octicon octicon-link"></span></a></h2>
<h2>Realtime Clock</h2><p>TempehWarden is highly dependent on the
correct time, as it logs significant amounts of time-sensitive data.
The RPi does not have a built-in RTC, and instead, obtains its time
from the internet. If the RPi is unable to connect to the internet, the
time on the RPi will be incorrect and this will adversely affect operations of TempehWarden. To address this and ensure that
TempehWarden always has the correct time regardless of internet
connectivity, an RTC board may be connected to the RPi via its I2C
pins. Adafruit offers a <a style="color: rgb(51, 255, 51);" href="https://www.adafruit.com/product/264">DS1307-based I2C RTC board</a>
in kit form that requires minimal soldering and can be directly
connected to the RPi's 3.3V line and I2C pins without the need for logic level
shifters. More information about this is included in the <a style="color: rgb(51, 255, 51);" href="/public/help/help_hardware.html">Hardware Examples page</a> and is also available <a style="color: rgb(51, 255, 51);" href="https://learn.adafruit.com/adding-a-real-time-clock-to-raspberry-pi">here</a>.</p><h2><br></h2><h2>Email/SMS Alarms</h2>
<p>TempehWarden can send alarm notifications to specified email
addresses if conditions are set in the Alarms dialog. For emails and
SMS messages, it is necessary to provide an email account name and
password to serve as the sender, as well as email addresses for the
alarm notifications to be sent to. It is recommended that a unique
email account be set up using Gmail (or Yahoo, etc) for this purpose.
Several email addresses can be set in the alarms configuration for
receivers of alarm notifications. These can include addresses for cell
phone accounts to receive SMS text messages on these cell phones. For
example, to send an email to a Verizon cell phone account, use the
number followed by vtext.com as the email address (e.g. <span style="color: rgb(255, 153, 0);">1234567890@vtext.com</span>).
Different cell providers have different email addresses associated with
SMS/text messaging. You can click on the Send Test Email button in the
Alarms dialog to test the alarms function to ensure the settings work. </p>
<p>If you receive an alarm notification by email or SMS, log into
your
web app as soon as possible to check on the status of your
cellar/refrigerator. Click on the Alarms button and then click on the
Clear Active Alarms button. This will turn off alarm triggering until
the problem can be rectified. This will prevent additional alarms from
being triggered (although TempehWarden can automatically do this if the
Block Mult. Emails option is set to True). Note that the web app will
show a dialog notification if an alarm has been triggered, and will
continue to show this whenever the page is loaded until the Clear
Active Alarms button is clicked. If the web app is connected when an
alarm is triggered, a dialog will pop up showing the alarm condition.
As well, the LCD display (both virtual and on the hardware display, if
the latter is installed) will also report the alarm condition until the
Clear Active Alarms button is pressed.</p>
<h2><br>
</h2>
<h2><a id="user-content-remote-access" class="anchor" href="#remote-access" aria-hidden="true"><span class="octicon octicon-link"></span></a>Remote
Access</h2>
<p>To access TempehWarden from a remote computer or smart phone,
it is
possible to use a web browser as with on a local LAN. However, this
requires a means to connect to the RPi through the internet to the
proper LAN address. There are two issues that complicate this. First,
many internet service providers provide dynamic instead of static IP
addresses, meaning that the IP used to connect the home LAN will change
over time. Thus, it is difficult to access the RPi if this IP address
changes. To address this issue, it is necessary to use a dynamic IP
address service like <a style="color: rgb(51, 255, 51);" href="http://dyn.com/dns/?rdr=dyndnsorg">dyndns.org</a> or <a style="color: rgb(51, 255, 51);" href="http://www.noip.com/">no-ip.com</a>. Once you sign up for this service, it
is possible to access the RPi using your dynamic IP service, such
myname.dyndns.org. A second issue is that while the router that
connects to the outside internet may have a particular IP address, this
single address is not sufficient to identify the RPi on the local LAN.
Thus, while the RPi may have a local IP address like 192.168.1.50,
typing this address in the address bar of a web browser on a device
outside of that LAN would not find the RPi. To address this issue, it
is necessary to use <a style="color: rgb(51, 255, 51);" href="https://en.wikipedia.org/wiki/Port_forwarding">port forwarding</a>, a method to assign a unique
address to a device on the home LAN that can be accessed from outside
of that LAN. Port forwarding is typically set up in your router (e.g.
"wireless router"). Since each router's software handles port
forwarding in a different manner, you will need to consult your
router's instruction manual for information about how to do so. Note
that some routers allow you to specify a remote port address that is
different from the local port address. TempehWarden defaults to port
8888 for access to its web server. However, if you have another device
on your RPi that uses this port, you can either set this port to a
different number (in the Configure dialog), or use your router's port
translation function to translate the remote port to point to 8888 on
the RPi's IP. While unnecessary for alarm functionality, setting up
remote access provides a means to check on the status of your cellar or
refrigerator while away from your local LAN.</p>
<h2><br>
<a id="user-content-reliability" class="anchor" href="#reliability" aria-hidden="true"><span class="octicon octicon-link"></span></a></h2>
<h2>Reliability</h2>
<p>With the provision of controller functionality, reliability is of paramount concern. If the RPi crashes for some unforseen reason, this could leave an actuator on or off, resulting in potentially disasterous results. To prevent the potential for dangerous conditions, it is strongly recommended that appliances connected to the RPi via relay boards be rated to power levels that will not result in hazardous situations. For example, only low wattage heaters should be used to control fermentation temperatures so that, should the RPi become unstable, an actuator stuck "on" would not lead to significant overheating of associated appliances that might constitute a hazard. Similarly, if the RPi crashes with a cooling actuator stuck in an energized state, there is the potential that the freezer may remain active, leading to freezing of contents inside the appliance. <b>The user of this software thus acknowledges the potential for such situations and assumes all responsibilities associated with the implementation and usage of this software</b>. To mitigate these situations, it is suggested that hardware methods be employed to minimize the impact of a crashed RPi. For example, on chest freezers and refrigerators with thermostatic controls, it is suggested that the thermostat be set to a point that will avoid temperatures below freezing. If the actuator on the RPi remains active due to software or hardware malfunction, the hardware thermostat will turn off the compressor before the freezer reaches a temperature below freezing. As an additional measure to address such concerns, the user may employ a software "watchdog timer," as described in this <a style="color: rgb(51, 255, 51);" href="https://www.domoticz.com/wiki/Setting_up_the_raspberry_pi_watchdog">article</a>. This method utilizes a watchdog timer built into the Broadcom processor on board the RPi, although this will not ensure that all crash conditions on the RPi are caught. As a better method, hardware "watchdog" circuits are available to monitor the RPi to ensure that the RPi remains operational and will automatically reboot the RPi if it should crash. An example of such circuits is available <a style="color: rgb(51, 255, 51);" href="http://www.amazon.com/SwitchDoc-Labs-WatchDog-Arduino-Raspberry/dp/B00OL1N7R2">here</a>. More information about the use of such a hardware watchdog timer is described in this <a style="color: rgb(51, 255, 51);" href="http://www.instructables.com/id/Raspberry-Pi-and-Arduino-Building-Reliable-Systems/step2/How-to-Set-Up-the-Raspberry-Pi-Internal-WatchDog-T/">Instructable</a>.   


</p>
<h2><br>
<a id="user-content-updating-TempehWarden" class="anchor" href="#updating-TempehWarden" aria-hidden="true"><span class="octicon octicon-link"></span></a></h2>
<h2>Updating TempehWarden</h2>
<p>TempehWarden will be updated from time to time, and this will
be
apparent by changes noted at the Github repository. To update your copy
of TempehWarden, open the command line shell (using Putty, etc) and
type:</p>
<div class="highlight highlight-bash">
<pre><span class="pl-s3">cd</span> /home/pi/CellarW<br>sudo git pull<br>npm update<br>sudo reboot</pre>
</div>
<p>This will copy any modified files from the Github repository
into
your TempehWarden folder and then reboot the RPi to institute the
changes.&nbsp;</p>
</body></html>
