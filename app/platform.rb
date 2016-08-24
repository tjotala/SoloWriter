module Platform
	ROOT_PATH = File.expand_path(File.dirname(__FILE__)).freeze
	LIB_PATH = File.expand_path(File.join(ROOT_PATH, 'lib')).freeze
	PUBLIC_PATH = File.expand_path(File.join(ROOT_PATH, '..', 'public')).freeze
	DOCS_PATH = File.expand_path(File.join(ROOT_PATH, '..', 'docs')).freeze
	USERS_PATH = File.expand_path(File.join(ROOT_PATH, '..', 'users')).freeze

	def self.pi?
		RUBY_PLATFORM == 'arm-linux-gnueabihf'
	end

	def self.pc?
		!self.pi?
	end

	if pi?
		LOGS_PATH = File.join(File::SEPARATOR, 'var', 'log', 'solo').freeze
		PLATFORM_PATH = File.join(LIB_PATH, 'pi').freeze
	else
		LOGS_PATH = File.expand_path(ENV['TEMP'] || ENV['TMP']).freeze
		PLATFORM_PATH = File.join(LIB_PATH, 'pc').freeze
	end

	$LOAD_PATH.unshift(Platform::LIB_PATH, Platform::PLATFORM_PATH)

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
