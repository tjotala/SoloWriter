require_relative 'errors'

class Network
	attr_reader :interface
	attr_reader :type
	attr_reader :ssid
	attr_reader :encryption
	attr_reader :quality

	def initialize(opts = { })
		@interface = opts[:interface] or missing_argument(:interface)
		@type = opts[:type] or missing_argument(:type)
		@ssid = opts[:ssid] || nil
		@encryption = opts[:encryption] || false
		@quality = opts[:quality] || 0
	end

	def to_json(*args)
		{
			interface: @interface,
			type: @type,
			ssid: @ssid,
			encryption: @encryption,
			quality: @quality,
		}.to_json(args)
	end
end
