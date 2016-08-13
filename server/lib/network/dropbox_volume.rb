class DropboxVolume < NetworkVolume
	def initialize
		super({
			id: 'dropbox',
			name: 'Dropbox'
		})
	end
end
