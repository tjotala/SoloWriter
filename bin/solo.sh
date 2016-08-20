#!/bin/sh
matchbox-window-manager &
ruby $HOME/solo/app/server.rb > $HOME/solo/logs/solo.log 2>&1
