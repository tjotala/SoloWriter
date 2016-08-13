#!/bin/sh
matchbox-window-manager &
ruby $HOME/solo/server/server.rb > $HOME/solo/logs/solo.log 2>&1
