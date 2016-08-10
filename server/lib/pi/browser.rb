class Browser
	def initialize(url)
		@pid = spawn("kweb3 -KJYHPU #{url}")
	end

	def shutdown
		Process.kill('TERM', @pid)
	end
end
