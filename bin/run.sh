#!/bin/sh
ruby $HOME/solo/app/server.rb > /var/log/solo/server.log 2>&1 &
xinit $HOME/solo/bin/solo.sh > /var/log/solo/xinit.log 2>&1
