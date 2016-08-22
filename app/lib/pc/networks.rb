require 'socket'

require 'errors'
require 'network'

class Networks
	def active
		Socket.getifaddrs.reject { |ifaddr| ifaddr.flags & Socket::IFF_UP == 0 || ifaddr.addr.nil? || !ifaddr.addr.ipv4? || ifaddr.addr.ipv4_loopback? }.map do |ifaddr|
			Network.new({
				interface: ifaddr.name,
				type: '802.3',
				ssid: nil,
				encryption: false,
				quality: 0,
				ip_address: ifaddr.addr.ip_address,
				mac_address: ifaddr.inspect[/hwaddr=([\h:]+)/, 1], # hokey, but works at least on RPi
			})
		end
	end

	def wireless
		[ 'fake' ]
	end
end
