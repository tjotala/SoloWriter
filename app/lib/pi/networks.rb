require 'socket'

require 'errors'
require 'network'

class Networks
	IPV4_ADDRESS = "\\d+\\.\\d+\\.\\d+\\.\\d+".freeze
	IPV6_ADDRESS = "\\h+::\\h+:\\h+:\\h+:\\h+\/\\d+".freeze
	MAC_ADDRESS = "\\h+:\\h+:\\h+:\\h+:\\h+:\\h+".freeze

	def active
		arr = [ ]
		scan_active do |net|
			arr << Network.new(net)
		end
		arr
	end

	def scan_active(&block)
		net = { }
		%x[ifconfig].each_line do |line|
			case line
			when /(\w+)\s+Link\s+encap:(.+)\s+HWaddr\s+(#{MAC_ADDRESS})/
				unless net[:interface].nil?
					yield(net)
					net = { }
				end
				net[:interface] = $1.to_s
				net[:type] = $2.to_s.strip
				net[:mac_address] = $3.to_s
			when /inet addr:(#{IPV4_ADDRESS})\s+Bcast:(#{IPV4_ADDRESS})\s+Mask:(#{IPV4_ADDRESS})/
				net[:ipv4_address] = $1.to_s
				net[:broadcast_address] = $2.to_s
				net[:netmask] = $3.to_s
			when /inet6 addr:(#{IPV6_ADDRESS})/
				net[:ipv6_address] = $1.to_s
			end
		end
		yield(net) unless net[:interface].nil?
	end

	def wireless
		arr = Array.new
		scan_wireless('wlan0') { |nw| arr << Network.new(nw) }
		arr
	end

	def scan_wireless(interface, &block)
		net = { interface: interface }
		%x[sudo iwlist #{interface} scan].each_line do |line|
			case line
			when /Cell \d+/
				unless net[:ssid].nil?
					yield(net)
					net = { interface: interface }
				end
			when /ESSID:"([^"]*)"/
				net[:ssid] = $1.to_s
			when /Protocol:(.+)/
				net[:type] = $1.to_s
			when /Encryption key:(on|off)/
				net[:encryption] = $1.to_s == 'on'
			when /Quality=(\d+)\//
				net[:quality] = $1.to_i
			end
		end
		yield(net) unless net[:ssid].nil?
	end
end
