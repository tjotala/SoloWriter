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
	attr_reader :known

	def initialize(opts = { })
		@interface = opts[:interface] or missing_argument(:interface)
		@type = opts[:type] or missing_argument(:type)
		@mac_address = opts[:mac_address]
		@ipv4_address = opts[:ipv4_address]
		@ipv6_address = opts[:ipv6_address]
		@broadcast_address = opts[:broadcast_address]
		@netmask = opts[:netmask]
		@ssid = opts[:ssid]
		@encryption = opts[:encryption]
		@quality = opts[:quality]
		@known = opts[:known]
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
			known: @known,
		}.select { |k, v| !v.nil? }.to_json(args)
	end
end
