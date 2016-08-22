require 'errors'

class Network
	attr_reader :interface
	attr_reader :type
	attr_reader :mac_address
	attr_reader :ipv4_address
	attr_reader :ipv6_address
	attr_reader :broadcast_address
	attr_reader :netmask
	attr_reader :ssid
	attr_reader :encryption
	attr_reader :quality

	def initialize(opts = { })
		@interface = opts[:interface] or missing_argument(:interface)
		@type = opts[:type] or missing_argument(:type)
		@mac_address = opts[:mac_address] || nil
		@ipv4_address = opts[:ipv4_address] || nil
		@ipv6_address = opts[:ipv6_address] || nil
		@broadcast_address = opts[:broadcast_address] || nil
		@netmask = opts[:netmask] || nil
		@ssid = opts[:ssid] || nil
		@encryption = opts[:encryption] || false
		@quality = opts[:quality] || 0
	end

	def to_json(*args)
		{
			interface: @interface,
			type: @type,
			mac_address: @mac_address,
			ipv4_address: @ipv4_address,
			ipv6_address: @ipv6_address,
			broadcast_address: @broadcast_address,
			netmask: @netmask,
			ssid: @ssid,
			encryption: @encryption,
			quality: @quality,
		}.to_json(args)
	end
end
