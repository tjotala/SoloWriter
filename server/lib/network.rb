class Network
	attr_reader :interface
	attr_reader :type
	attr_reader :ssid
	attr_reader :encryption
	attr_reader :quality

	def initialize(opts = { })
		@interface = opts[:interface] or raise ArgumentError
		@type = opts[:type] or raise ArgumentError
		@ssid = opts[:ssid] || nil
		@encryption = opts[:encryption] || false
		@quality = opts[:quality] || 0
	end
end

