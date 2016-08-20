require 'errors'
require 'network'

class Networks
	def to_json(*args)
		list.to_json(args)
	end

	def list
		arr = Array.new
		interface = 'wlan0'
		ssid = protocol = encryption = quality = nil
		%x[sudo iwlist #{interface} scan].each_line do |line|
			puts line
			case line
			when /Cell \d+/
				unless ssid.nil?
					arr << Network.new({
						interface: interface,
						type: protocol,
						ssid: ssid,
						encryption: encryption,
						quality: quality
					})
					ssid = protocol = encryption = quality = nil
				end
			when /ESSID:"([^"]*)"/
				ssid = $1.to_s
				puts "got ssid: #{ssid}"
			when /Protocol:(.+)/
				protocol = $1.to_s
				puts "got protocol: #{protocol}"
			when /Encryption key:(on|off)/
				encryption = $1.to_s == 'on'
				puts "got encryption: #{encryption}"
			when /Quality=(\d+)\//
				quality = $1.to_i
				puts "got quality: #{quality}"
			end
		end
		unless ssid.nil?
			arr << Network.new({
				interface: interface,
				type: protocol,
				ssid: ssid,
				encryption: encryption,
				quality: quality
			})
		end
		arr
	end
end
