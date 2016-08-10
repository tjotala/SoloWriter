class Networks
	def self.list
		%x[sudo iwlist wlan0 scan].scan(/ESSID:"([^"]+)"/).flatten
	end
end
