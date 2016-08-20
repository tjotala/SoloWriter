require_relative 'errors'

class CloudVolume < Volume
	TYPE = 'network'.freeze

	@@volumes = Array.new

	def initialize(opts = { })
		super(opts.merge({
			type: opts[:id],
			interface: TYPE,
		}))
	end

	def mount
		not_implemented
	end

	def unmount
		not_implemented
	end

	class << self
		def list
			@@volumes.map do |cls|
				cls.new
			end
		end

		def inherited(cls)
			@@volumes << cls
		end
	end
end

Dir[File.join(Platform::LIB_PATH, 'cloud', '*')].each { |file| require file }
