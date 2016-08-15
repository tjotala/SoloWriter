require 'json'
require_relative 'volumes'
require_relative 'networks'
require_relative 'documents'

class SoloServer < Sinatra::Base
	configure do
		set :root, Platform::ROOT_PATH
		set :public_folder, Platform::PUBLIC_PATH
		enable :static
		enable :logging
		set :static_cache_control, [ :public, :max_age => 10 ]
		set :port, 8080
		set :bind, '0.0.0.0' # allow access from other hosts
		set :volumes, Volumes.new
		set :networks, Networks.new
	end

	before do
		content_type :json
		# we don't want the client to cache these API responses
		cache_control :public, :no_store
	end

	not_found do
		json error: "not found: #{request.url}"
	end

	def resolve(volume_id)
		settings.volumes.by_id(volume_id)
	rescue RuntimeError
		halt 404
	end

	get '/' do
		cache_control :public, :max_age => 60
		content_type :html
		send_file(File.join(settings.public_folder, 'index.html'))
	end

	##
	# List Storage Volumes
	#
	# @method GET
	# @return 200 list of storage volumes
	#
	get '/api/volumes/?' do
		json settings.volumes.refresh
	end

	##
	# Get Storage Volume
	#
	# @method GET
	# @param volume_id storage volume
	# @return 200 storage volume
	# @return 404 unknown volume
	#
	get '/api/volumes/:volume_id/?' do
		json resolve(params[:volume_id])
	end

	##
	# Mount Storage Volume
	#
	# @method POST
	# @param volume_id storage volume
	# @return 204 ok
	# @return 409 failed
	#
	post '/api/volumes/:volume_id/mount' do
		begin
			logger.info "mount: attempting #{params[:volume_id]}"
			res = settings.volumes.mount(resolve(params[:volume_id]))
			logger.info "mount: got #{res.inspect}"
			json res
		rescue RuntimeError => e
			logger.error e.backtrace.join("\n")
	 		halt 409, { error: e.message }.to_json
		rescue NotImplementedError => e
			halt 400, { error: e.message }.to_json
	 	end
	end

	##
	# Unmount Storage Volume
	#
	# @method POST
	# @param volume_id storage volume
	# @return 204 ok
	# @return 404 unknown volume
	# @return 409 failed
	#
	post '/api/volumes/:volume_id/unmount' do
		begin
			logger.info "unmount: attempting #{params[:volume_id]}"
			res = settings.volumes.unmount(resolve(params[:volume_id]))
			logger.info "unmount: got #{res.inspect}"
			json res
		rescue RuntimeError => e
			logger.error e.backtrace.join("\n")
			halt 409, { error: e.message }.to_json
		rescue NotImplementedError => e
			halt 409, { error: e.message }.to_json
		end
	end

	##
	# List WiFi Networks
	#
	# @method GET
	# @return 200 list of networks
	#
	get '/api/networks/?' do
		json settings.networks
	end

	##
	# List Documents
	#
	# @method GET
	# @param volume_id storage volume
	# @return 200 list of documents
	#
	get '/api/volumes/:volume_id/files/?' do
		json Documents.new(resolve(params[:volume_id])).list
	end

	##
	# Get Document
	#
	# @method GET
	# @param volume_id storage volume
	# @param filename
	# @return 200 document content
	#
	get '/api/volumes/:volume_id/files/:filename' do
		send_file(Documents.new(resolve(params[:volume_id])).get(params[:filename]).path, :type => :text)
	end

	##
	# Store Document
	#
	# @method PUT
	# @param volume_id storage volume
	# @param filename
	# @body document content
	# @return 204 ok
	#
	put '/api/volumes/:volume_id/files/:filename' do
		Documents.new(resolve(params[:volume_id])).get(params[:filename]).create(request.body.read)
		status 204
	end

	##
	# Delete Document
	#
	# @method DELETE
	# @param volume_id storage volume
	# @param filename
	# @return 204 ok
	#
	delete '/api/volumes/:volume_id/files/:filename' do
		Documents.new(resolve(params[:volume_id])).get(params[:filename]).remove
		status 204
	end

	##
	# Quit Server
	#
	# @method POST
	# @return 204 ok (will not return)
	#
	post '/api/quit' do
		settings.browser.shutdown
		Platform::quit
		status 204 # probably won't even get here
	end

	##
	# Shutdown Appliance
	#
	# @method POST
	# @return 204 ok (will not return)
	#
	post '/api/shutdown' do
		settings.browser.shutdown
		Platform::shutdown
		status 204 # probably won't even get here
	end
end
