#!/bin/sh
sudo mkdir -p /var/log/solo
sudo chmod a+rw /var/log/solo
matchbox-window-manager > /var/log/solo/wm.log 2>&1 &
ruby $HOME/solo/app/server.rb > /var/log/solo/server.log 2>&1
