require 'promise'
require_relative 'network'

class Networks
	def initialize
		refresh
	end

	def refresh
		@networks = promise { list }
	end

	def to_json(*args)
		@networks.to_json(args)
	end


	def list
		raise NotImplementedError
	end
end

require File.join(Platform::PLATFORM_PATH, 'networks')
