class Browser
	def initialize(url)
		@url = url
	end

	def launch
		# K = kiosk mode
		# J = enable JavaScript
		# E = enable cookies
		# Y = disable video and audio
		# H = use provided URL as home page
		# U = ???
		@pid = spawn("kweb3 -KJEYHU #{@url}")
		self
	end

	def shutdown
		Process.kill('TERM', @pid)
		self
	end
end
