# Introduction

This is a README for building a minimalistic distraction free text editor out of a Raspberry Pi board, with display and keyboard.

# Installation

1) Download and install Raspbian Jessie or Jessie Lite (recommended) on a MicroSD card.

	https://www.raspberrypi.org/downloads/raspbian/

2) Boot the Raspberry Pi with the MicroSD card

3) Log in to the Raspberry Pi via SSH.

	ssh pi@<ip-address>

4) Configure the device to sync time from NTP source.

	sudo apt-get install -y ntpdate
	sudo ntpdate -u pool.ntp.org

5) Install matchbox-window-manager, a minimalistic X11 window manager.

	sudo apt-get install -y matchbox-window-manager

6) Install kweb, a minimalistic kiosk web browser. Ignore the warnings about missing YouTube, VLC, and so on. You will not need those for this purpose.

	wget http://steinerdatenbank.de/software/kweb-1.6.9.tar.gz
	tar -xzf kweb-1.6.9.tar.gz
	cd kweb-1.6.9
	./debinstall

7) Install Sinatra and its dependencies. Nevermind the docs, you won't need them.

	sudo gem install -y --no-document sinatra
