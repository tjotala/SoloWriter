module Platform
	ROOT_PATH = File.expand_path(File.dirname(__FILE__)).freeze

	PLATFORM_TYPE = ((RUBY_PLATFORM == 'arm-linux-gnueabihf') ? :pi : :pc).freeze

	LIB_PATH = File.join(File.expand_path(File.dirname(__FILE__)), 'lib').freeze
	PLATFORM_LIB_PATH = File.join(LIB_PATH, PLATFORM_TYPE.to_s).freeze

	def self.pi?
		PLATFORM_TYPE == :pi
	end

	def self.pc?
		PLATFORM_TYPE == :pc
	end

	def self.require_lib(file)
		require File.join(PLATFORM_LIB_PATH, file)
	rescue LoadError
		require File.join(LIB_PATH, file)
	end

	def self.quit
		Process.kill('TERM', Process.pid)
	end

	def self.shutdown
		exec("sudo shutdown -h now") if pi?
	end
end
