#!/bin/sh
unclutter &
matchbox-window-manager 2>&1 &

log=/var/log/solo/browser.log
rm $log
until [ `curl -s http://localhost:8080/api/ping` = 'ok' ]; do
	echo `date`: waiting for server to launch... >> $log
	sleep 1
done
midori -e Fullscreen -a http://127.0.0.1:8080 >> $log 2>&1

#
# alternatively, using kweb3:
#
# K = kiosk mode
# J = enable JavaScript
# E = enable cookies
# Y = disable video and audio
# H = use provided URL as home page
#
# kweb3 -KJEYH http://localhost:8080 >> $log 2>&1 
