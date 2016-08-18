class AmazonCloudDriveVolume < CloudVolume
	def initialize
		super({
			id: 'amazon',
			name: 'Amazon Cloud Drive'
		})
	end
end
