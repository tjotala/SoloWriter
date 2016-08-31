require 'promise'

require 'errors'
require 'network'

class Networks
	IPV4_ADDRESS = "\\d+\\.\\d+\\.\\d+\\.\\d+".freeze
	IPV6_ADDRESS = "\\h+::\\h+:\\h+:\\h+:\\h+\/\\d+".freeze
	MAC_ADDRESS = "\\h+:\\h+:\\h+:\\h+:\\h+:\\h+".freeze

	MOD_WPA = File.join(Platform::BIN_PATH, 'mod_wpa.rb').freeze

	TYPE_ETHERNET = 'ethernet'.freeze
	TYPE_WIRELESS = 'wireless'.freeze
	TYPE_UNKNOWN = 'unknown'.freeze

	class KnownWireless
		attr_reader :list

		def initialize
			@list = promise { JSON.parse(Platform::run(%Q[sudo #{MOD_WPA} --mode list]), :symbolize_names => true) }
		end

		def unknown?(ssid)
			@list.find { |known| known[:ssid] == ssid }.nil?
		end

		def known?(ssid)
			!unknown?(ssid)
		end

		def add(interface, ssid, password)
			if unknown?(ssid)
				if password.nil?
					Platform::run(%Q[sudo #{MOD_WPA} --mode add --ssid "#{ssid}"])
				else
					Platform::run(%Q[sudo #{MOD_WPA} --mode add --ssid "#{ssid}" --psk "#{password}"])
				end
			end
		end

		def delete(interface, ssid)
			Platform::run(%Q[sudo #{MOD_WPA} --mode del --ssid "#{ssid}"])
		end
	end

	def available
		Platform::run("sudo ifconfig -a -s | grep -v Iface | grep -v lo").each_line.map do |line|
			interface = line.split.first
			get(interface)
		end
	end

	def get(interface)
		net = { }
		Platform::run("sudo ifconfig #{interface}").each_line do |line|
			case line
			when /(\w+)\s+Link.+HWaddr\s+(#{MAC_ADDRESS})/
				net[:interface] = $1.to_s.strip
				net[:mac_address] = $2.to_s.strip
				case net[:interface]
				when /^eth/
					net[:type] = TYPE_ETHERNET
				when /^wlan/
					net[:type] = TYPE_WIRELESS
					case Platform::run("sudo iwconfig #{interface}", true)
					when /#{interface}\s+(IEEE.+)\s+ESSID:"([^"]+)"/
						net[:protocol] = $1.to_s.strip
						net[:ssid] = $2.to_s.strip
					else
						net[:protocol] = nil
						net[:ssid] = nil
					end
				else
					net[:type] == TYPE_UNKNOWN
				end
			when /inet addr:(#{IPV4_ADDRESS})\s+Bcast:(#{IPV4_ADDRESS})\s+Mask:(#{IPV4_ADDRESS})/
				net[:ipv4_address] = $1.to_s.strip
				net[:broadcast_address] = $2.to_s.strip
				net[:netmask] = $3.to_s.strip
			when /inet6 addr:(#{IPV6_ADDRESS})/
				net[:ipv6_address] = $1.to_s.strip
			end
		end
		return nil if net[:interface].nil? || net[:interface].empty?
		net[:gateway_address] = Platform::run("netstat -r | awk '/default.+#{interface}/ { print $2; exit }'", true).chomp.strip
		if net[:ipv4_address].nil? or net[:gateway_address].empty?
			net[:gateway_address] = nil
			net[:connected] = false
		else
			net[:connected] = (Platform::run("ping -q -w 1 -c 1 -I #{interface} #{net[:gateway_address]}", true) !~ /unreachable/)
		end
		Network.new(net)
	end

	def scan_wireless(interface)
		arr = Array.new
		kw = KnownWireless.new
		scan(interface) do |net|
			net[:known] = kw.known?(net[:ssid])
			arr << Network.new(net)
		end
		arr
	end

	def scan(interface, &block)
		net = { }
		Platform::run("sudo iwlist #{interface} scan").each_line do |line|
			case line
			when /Cell \d+ - Address: (#{MAC_ADDRESS})/
				yield(net) unless net[:ssid].nil? or net[:ssid].empty?
				net = { interface: interface, type: TYPE_WIRELESS, mac_address: $1.to_s }
			when /ESSID:"([^"]*)"/
				net[:ssid] = $1.to_s
			when /Protocol:(.+)/
				net[:protocol] = $1.to_s
			when /Encryption key:(on|off)/
				net[:encryption] = $1.to_s == 'on'
			when /Quality=(\d+)\//
				net[:quality] = $1.to_i
			end
		end
		yield(net) unless net[:ssid].nil? or net[:ssid].empty?
	end

	def connect(interface, ssid, password)
		KnownWireless.new.add(interface, ssid, password)
		Platform::run("sudo ifdown #{interface}")
		Platform::run("sudo iwconfig #{interface} essid \"#{ssid}\"")
		Platform::run("sudo ifup #{interface}")
		get(interface)
	end

	def disconnect(interface)
		Platform::run("sudo ifdown #{interface}")
		get(interface)
	end

	def list_known(interface)
		KnownWireless.new.list
	end

	def forget_known(interface, ssid)
		KnownWireless.new.delete(interface, ssid)
		get(interface)
	end
end
