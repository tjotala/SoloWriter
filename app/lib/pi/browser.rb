class Browser
	def initialize(url)
		@url = url
	end

	def launch
		if kweb?
			# K = kiosk mode
			# J = enable JavaScript
			# E = enable cookies
			# Y = disable video and audio
			# H = use provided URL as home page
			@pid = spawn("kweb3 -KJEYH #{@url}", [ :out, :err ] => [ File.join(Platform::LOGS_PATH, 'browser.log'), 'w' ])
		elsif midori?
			@pid = spawn("midori -e Fullscreen -a #{@url}", [ :out, :err ] => [ File.join(Platform::LOGS_PATH, 'browser.log'), 'w' ])
		else
			internal_error("no browser installed")
		end
		self
	end

	def shutdown
		Process.kill('TERM', @pid)
		self
	end

	private

	def kweb?
		Platform.which('kweb3')
	end

	def midori?
		Platform.which('midori')
	end
end
