# Introduction

This is a README for building a minimalistic distraction-free text editor out of a Raspberry Pi board, with display and keyboard.

# Installation

In the following description, *host* refers to the PC or Mac that you're using to bootstrap the setup and *target* refers to the Raspberry Pi.

1. On the *host*

Download and write the [Raspbian Jessie or Jessie Lite](https://www.raspberrypi.org/downloads/raspbian/) image on a MicroSD card.

2. On the *host*

Generate a SSH keypair, if you do not have one already.

	ssh-keygen -b 2048

3. On the *host*

Install [Ruby](https://www.ruby-lang.org/en/downloads/) and [Rake](http://rake.rubyforge.org/) on your *host*, if you do not have them already.

3. On the *target*

Insert the MicroSD card, connect the device to network, keyboard and a display.

4. On the *target*

Power on. Once it finishes booting up, note the IP address on the display.

5. On the *host*

Copy your SSH key to the *target* to make the subsequent steps easier:

	ssh-copy-id pi@<ip_address>

You will be prompted for the password. Enter the default password *raspberry*.

6. On the *host*

Run a rake task to prepare the Raspberry Pi for use. Go grab a beverage as this will take some time.

	rake TARGET_IP=<ip_address> prep:lite

7. On the *target*

Launch the configuration utility to tweak the rest of the system settings to your liking:

	sudo raspi-config

Alternatively, you can do that remotely from the *host* via an SSH terminal:

	ssh pi@<ip_address>

I recommend at a minimum the following settings:

	Boot Options: B2 Console Autologin
	Wait for Network on Boot: No
	Internationalization Options: Change Timezone
	Internationalization Options: Change Keyboard Layout
	Internationalization Options: Change WiFi Country

8. On the *host*

Deploy the software to the Raspberry Pi, and run the tests:

	rake TARGET_IP=<ip_address> deploy target:test

This may take a while for the first time, as it downloads and installs several Ruby gems to the system.
