class DropboxVolume < CloudVolume
	def initialize
		super({
			id: 'dropbox',
			name: 'Dropbox'
		})
	end
end
