# Introduction

This is a README for building a minimalistic distraction free text editor out of a Raspberry Pi board, with display and keyboard.

# Installation

1) Download and install Raspbian Jessie or Jessie Lite (recommended) image on a MicroSD card.

	https://www.raspberrypi.org/downloads/raspbian/

2) Connect the Raspberry Pi to a ethernet cable

3) Boot the Raspberry Pi with the MicroSD card installed

4) Run the Rake prep task to prepare it for use. Go grab a beverage, this will take some time!

	rake TARGET_IP=<ip_address> prep:lite

5) Run raspi-config to tweak the system settings
