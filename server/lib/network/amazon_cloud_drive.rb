class AmazonCloudDriveVolume < NetworkVolume
	def initialize
		super({
			id: 'amazon',
			name: 'Amazon Cloud Drive'
		})
	end
end
