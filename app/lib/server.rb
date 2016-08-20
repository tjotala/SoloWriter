require 'json'

require 'errors'
require 'users'
require 'volumes'
require 'networks'
require 'documents'

class SoloServer < Sinatra::Base
	configure do
		set :root, Platform::ROOT_PATH
		set :public_folder, Platform::PUBLIC_PATH
		enable :static
		enable :sessions
		enable :logging
		set :static_cache_control, [ :public, :max_age => 60 ]
		set :port, 8080
		set :volumes, Volumes.new
		set :networks, Networks.new
		set :users, Users.new
	end

	configure :development do
		set :bind, '0.0.0.0' # allow access from other hosts
		set :static_cache_control, [ :public, :max_age => 5 ]
	end

	before do
		content_type :json
		# we don't want the client to cache these API responses
		cache_control :public, :no_store

		if request.content_type =~ /application\/json/ and request.content_length.to_i > 0
			request.body.rewind
			@request_json = JSON.parse(request.body.read, :symbolize_names => true)
		end
	end

	not_found do
		json error: "not found: #{request.url}"
	end

	def volume_from_id(volume_id)
		settings.volumes.by_id(volume_id)
	rescue RuntimeError => e
		halt 404, { error: e.message }
	end

	def set_token(username, password)
		session[:token] = settings.users.new_token(username, password).encode
	end

	def clear_token
		session[:token] = nil
	end

	def user_from_token
		session[:token].nil? ? nil : settings.users.from_token(session[:token])
	end

	def documents(volume_id)
		Documents.new(volume_from_id(volume_id), user_from_token)
	end

	get '/' do
		cache_control :public, :max_age => 60
		content_type :html
		send_file(File.join(settings.public_folder, 'index.html'))
	end

	##
	# List Users
	#
	# @method GET
	# @return 200 list of users
	#
	get '/api/users/?' do
		json settings.users.list
	end

	##
	# Add User
	#
	# @method PUT
	# @param username
	# @body password
	# @return 200 list of users
	# @return 403 if user already exists
	#
	put '/api/users/:username' do
		begin
			settings.users.create(params[:username], @request_json[:password])
			json settings.users.list
		rescue AuthenticationError => e
			halt 401, { error: e.message }.to_json
		end
	end

	##
	# Delete User
	#
	# @method DELETE
	# @param username
	# @body password
	# @return 200 list of users
	# @return 403 if password does not match user
	#
	delete '/api/users/:username' do
		begin
			settings.users.delete(params[:username], @request_json[:password])
			json settings.users.list
		rescue AuthenticationError => e
			halt 401, { error: e.message }.to_json
		end
	end

	##
	# Change User Name or Password
	#
	# @method POST
	# @param username
	# @body password
	# @body new_password
	# @body new_username
	# @return 200 list of users
	# @return 403 if password does not match user
	#
	post '/api/users/:username' do
		begin
			if @request_json[:new_username]
				settings.users.update_username(params[:username], @request_json[:password], @request_json[:new_username])
			elsif @request_json[:old_password]
				settings.users.update_password(params[:username], @request_json[:password], @request_json[:new_password])
			end
			json settings.users.list
		rescue AuthenticationError => e
			halt 401, { error: e.message }.to_json
		end
	end

	##
	# Login User
	#
	# @method POST
	# @body username
	# @body password
	# @return 200
	# @return 403 if password does not match user
	#
	post '/api/login' do
		begin
			set_token(@request_json[:username], @request_json[:password])
		rescue AuthenticationError => e
			halt 401, { error: e.message }.to_json
		end
	end

	##
	# Logout User
	#
	# @method POST
	# @return 200
	#
	post '/api/logout' do
		clear_token
		status 204
	end

	##
	# List Storage Volumes
	#
	# @method GET
	# @return 200 list of storage volumes
	#
	get '/api/volumes/?' do
		json settings.volumes.list
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
		json volume_from_id(params[:volume_id])
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
			res = settings.volumes.mount(volume_from_id(params[:volume_id]))
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
			res = settings.volumes.unmount(volume_from_id(params[:volume_id]))
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
		json documents(params[:volume_id]).list
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
		send_file(documents(params[:volume_id]).get(params[:filename]).path, :type => :text)
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
		documents(params[:volume_id]).get(params[:filename]).create(request.body.read)
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
		documents(params[:volume_id]).get(params[:filename]).remove
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
