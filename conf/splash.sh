#!/bin/sh

### BEGIN INIT INFO
# Provides:          splash
# Required-Start:
# Required-Stop:
# Should-Start:      
# Default-Start:     S
# Default-Stop:
# Short-Description: Show custom splash screen
# Description:       Show custom splash screen
### END INIT INFO

case $1 in
  start)
    fbi -T 1 -noverbose -a /etc/splash.png
    ;;
  restart|reload|force-reload)
    echo "Error: argument '$1' not supported" >&2
    exit 3
    ;;
  stop)
    killall fbi
    ;;
  status)
    ;;
  *)
    echo "Usage: splash [start|stop]" >&2
    exit 3
    ;;
esac:

exit 0
