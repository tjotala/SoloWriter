require 'open3'

module Platform
	ROOT_PATH = File.expand_path(File.dirname(__FILE__)).freeze
	LIB_PATH = File.expand_path(File.join(ROOT_PATH, 'lib')).freeze
	BIN_PATH = File.expand_path(File.join(ROOT_PATH, '..', 'bin')).freeze
	PUBLIC_PATH = File.expand_path(File.join(ROOT_PATH, '..', 'public')).freeze
	DOCS_PATH = File.expand_path(File.join(ROOT_PATH, '..', 'docs')).freeze
	USERS_PATH = File.expand_path(File.join(ROOT_PATH, '..', 'users')).freeze

	PRODUCT_NAME = 'SoloWriter'.freeze
	PRODUCT_VERSION = '1.0'.freeze
	PRODUCT_FULLNAME = "#{PRODUCT_NAME}/#{PRODUCT_VERSION}".freeze

	def self.pi?
		RUBY_PLATFORM == 'arm-linux-gnueabihf'
	end

	def self.pc?
		!self.pi?
	end

	if pi?
		PLATFORM_TYPE = 'pi'.freeze
		LOGS_PATH = File.join(File::SEPARATOR, 'var', 'log', 'solo').freeze
	else
		PLATFORM_TYPE = 'pc'.freeze
		LOGS_PATH = File.expand_path(ENV['TEMP'] || ENV['TMP']).freeze
	end
	PLATFORM_PATH = File.join(LIB_PATH, PLATFORM_TYPE).freeze

	$LOAD_PATH.unshift(Platform::LIB_PATH, Platform::PLATFORM_PATH)

	def self.run(cmd, ignore_errors = false)
		out, err, status = Open3.capture3(cmd)
		conflicted_resource(caller[0]) if status.to_i != 0 and !ignore_errors
		out
	end

	def self.quit
		Process.kill('TERM', Process.pid)
	end

	def self.shutdown
		exec("sudo shutdown -h now") if pi?
	end

	def self.which(cmd)
		exts = ENV['PATHEXT'] ? ENV['PATHEXT'].split(';') : ['']
		ENV['PATH'].split(File::PATH_SEPARATOR).each do |path|
			exts.each do |ext|
				exe = File.join(path, "#{cmd}#{ext}")
				return exe if File.executable?(exe) && !File.directory?(exe)
			end
		end
		nil
	end
end
