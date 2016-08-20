class Browser
	def initialize(url)
		@url = url
	end

	def launch
		@pid = spawn("kweb3 -KJYHPU #{@url}")
		self
	end

	def shutdown
		Process.kill('TERM', @pid)
		self
	end
end
