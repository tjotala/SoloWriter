module Platform
	ROOT_PATH = File.expand_path(File.dirname(__FILE__)).freeze
	LIB_PATH = File.expand_path(File.join(ROOT_PATH, 'lib')).freeze
	PUBLIC_PATH = File.expand_path(File.join(ROOT_PATH, '..', 'public')).freeze
	DOCS_PATH = File.expand_path(File.join(ROOT_PATH, '..', 'docs')).freeze
	USERS_PATH = File.expand_path(File.join(ROOT_PATH, '..', 'users')).freeze

	PLATFORM_TYPE = ((RUBY_PLATFORM == 'arm-linux-gnueabihf') ? :pi : :pc).freeze
	PLATFORM_PATH = File.join(LIB_PATH, PLATFORM_TYPE.to_s).freeze

	def self.pi?
		PLATFORM_TYPE == :pi
	end

	def self.pc?
		PLATFORM_TYPE == :pc
	end

	def self.quit
		Process.kill('TERM', Process.pid)
	end

	def self.shutdown
		exec("sudo shutdown -h now") if pi?
	end
end
