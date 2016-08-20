require 'errors'

class CloudVolume < Volume
	TYPE = 'network'.freeze

	@@volumes = Array.new

	def initialize(opts = { })
		super(opts.merge({
			type: opts[:id],
			interface: TYPE,
		}))
	end

	def enabled?
		false
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
				volume = cls.new
				volume.enabled? ? nil : volume
			end.compact
		end

		def inherited(cls)
			@@volumes << cls
		end
	end
end

Dir[File.join('cloud', '*')].each { |file| require file }
