class Browser
	def initialize(url)
		@url = url
	end
end

require File.join(Platform::PLATFORM_PATH, 'browser')
