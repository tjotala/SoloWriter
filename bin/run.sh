#!/bin/sh
mkdir -p /var/log/solo
xinit $HOME/solo/bin/solo.sh > /var/log/solo/xinit.log 2>&1
