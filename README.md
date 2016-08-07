# Introduction

This is a README for building a minimalistic distraction free text editor out of a Raspberry Pi board, with display and keyboard.

# Installation

0) Download and install Raspbian Jessie or Jessie Lite on a MicroSD card:

	https://www.raspberrypi.org/downloads/raspbian/

1) Install matchbox-window-manager, a minimalistic X11 window manager

	sudo apt-get install matchbox-window-manager

2) Install kweb, a minimalistic kiosk web browser:

	wget http://steinerdatenbank.de/software/kweb-1.6.9.tar.gz
	tar -xzf kweb-1.6.9.tar.gz
	cd kweb-1.6.9
	./debinstall

Ignore the warnings about missing YouTube, VLC, and so on. You will not need those for this purpose.
