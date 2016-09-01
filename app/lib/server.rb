require 'rubygems'
require 'bundler/setup'
require 'sinatra/base'
require 'sinatra/json'
require 'json'
require 'mail'

require 'errors'
require 'users'
require 'volumes'
require 'networks'
require 'documents'
require 'username'
require 'password'
require 'slides'

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
		set :show_exceptions, false
		set :raise_errors, false
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

	error ArgumentError do
		bad_request(env['sinatra.error'].message)
	end

	error AuthenticationError do
		clear_token
		halt 401, { error: env['sinatra.error'].message }.to_json
	end

	error AuthorizationError do
		halt 403, { error: env['sinatra.error'].message }.to_json
	end

	error NoSuchResourceError do
 		halt 404, { error: env['sinatra.error'].message }.to_json
	end

	error ConflictedResourceError do
 		halt 409, { error: env['sinatra.error'].message }.to_json
	end

	error InternalError do
		halt 500, { error: env['sinatra.error'].message }.to_json
	end

	error NotImplementedError do
		halt 501, { error: env['sinatra.error'].message }.to_json
	end

	helpers do
		def volume_from_id(id)
			settings.volumes.from_id(id)
		end

		def has_token?
			!session[:token].nil?
		end

		def get_token
			session[:token]
		end

		def set_token(token)
			session[:token] = token
		end

		def clear_token
			session.clear
		end

		def user_from_token
			user = has_token? ? settings.users.from_token(get_token) : nil
			logger.info("user from token: #{user.to_s}")
			user
		end

		def documents(volume_id, user_id = nil)
			doc = Documents.new(volume_from_id(volume_id), user_id || user_from_token)
			logger.info("document folder: #{doc.path}")
			doc
		end

		def bad_request(msg)
			halt 400, { error: msg }.to_json
		end

		def config
			{
				platform: %x[uname -a].chomp.strip,
				environment: settings.environment,
				time: Time.now.utc.iso8601,
				zone: Time.now.zone,
				offset: Time.now.utc_offset / 60,
				valid_username: Username::PATTERN.source,
				valid_password: Password::PATTERN.source,
				local_volume_id: LocalVolume::ID,
			}
		end
	end

	#################################################################
	## General
	#################################################################

	##
	# Get Home Page
	#
	# @method GET
	# @return 200 configuration items
	#
	get '/' do
		cache_control :public, :max_age => 60
		send_file(File.join(settings.public_folder, 'index.html'), :type => :html)
	end

	##
	# Get Configuration
	#
	# @method GET
	# @return 200 configuration items
	#
	get '/api/config' do
		json config
	end

	##
	# Send Email
	#
	# @method POST
	# @param sender
	# @param password
	# @param recipient
	# @param subject
	# @param content
	# @return 200 ok
	#
	post '/api/send' do
		begin
			mail = Mail.new({
				from: @request_json[:sender],
				to: @request_json[:recipient],
				subject: @request_json[:subject],
				body: @request_json[:content]
			})
			mail.header['X-Sent-From'] = Platform::PRODUCT_FULLNAME
			options = {
				address: "smtp.gmail.com",
	            port: 587,
	            domain: 'tjotala.com',
	            user_name: @request_json[:sender],
	            password: @request_json[:password],
	            authentication: 'plain',
	            enable_starttls_auto: true
	        }
			mail.delivery_method :smtp, options
			mail.deliver
		rescue NoMethodError => e # this would be typically if we de-ref the @request_json with a key that's not defined
			bad_request("missing field(s)")
		end
	end

	##
	# Ping Server
	#
	# @method GET
	# @return 200 ok
	#
	get '/api/ping' do
		content_type :text
		'ok'
	end

	##
	# Quit Server
	#
	# @method POST
	# @return 204 ok
	#
	post '/api/quit' do
		Thread.new do
			Kernel::sleep(2)
			Platform::quit
		end
		status 204
	end

	##
	# Shutdown Appliance
	#
	# @method POST
	# @return 204 ok
	#
	post '/api/shutdown' do
		Thread.new do
			Kernel::sleep(2)
			Platform::shutdown
		end
		status 204
	end

	#################################################################
	## Users
	#################################################################

	##
	# List Users
	#
	# @method GET
	# @return 200 list of users
	#
	get '/api/users/?' do
		user = user_from_token
		json settings.users.list(!user.nil? && user.id)
	end

	##
	# Create User
	#
	# @method POST
	# @body username
	# @body password
	# @return 200 new user
	# @return 403 if user already exists
	#
	post '/api/users/?' do
		json settings.users.create(@request_json[:username], @request_json[:password])
	end

	##
	# Delete User
	#
	# @method DELETE
	# @param user_id
	# @body password
	# @return 204
	# @return 403 if password does not match user
	#
	delete '/api/users/:id' do
		settings.users.delete(params[:id], @request_json[:password])
		status 204
	end

	##
	# Change User Name or Password
	#
	# @method POST
	# @param user ID
	# @body password
	# @body new_password
	# @body new_username
	# @body new_settings (token required; no password required)
	# @return 200 updated user
	# @return 403 if password does not match user
	#
	post '/api/users/:id' do
		if @request_json[:new_username]
			json settings.users.update_username(params[:id], @request_json[:password], @request_json[:new_username])
		elsif @request_json[:new_password]
			json settings.users.update_password(params[:id], @request_json[:password], @request_json[:new_password])
		elsif @request_json[:new_settings]
			user = user_from_token
			forbidden if params[:id] != user.id
			json settings.users.update_settings(params[:id], @request_json[:new_settings])
		else
			bad_request("nothing to change")
		end
	end

	##
	# Login User
	#
	# @method POST
	# @body username
	# @body id
	# @body password
	# @return 200 user
	# @return 403 if password does not match user
	# @notes Either username or ID must be supplied. If both are given, prefer ID.
	#
	post '/api/login' do
		user = if @request_json[:id]
			settings.users.from_id(@request_json[:id], @request_json[:password])
		elsif @request_json[:username]
			settings.users.from_name(@request_json[:username], @request_json[:password])
		else
			invalid_argument(:id, "either id or username must be included")
		end
		set_token(settings.users.new_token(user).encode)
		json user
	end

	##
	# Logout User
	#
	# @method POST
	# @return 204
	#
	post '/api/logout' do
		clear_token
		status 204
	end

	##
	# Who Am I
	#
	# @method GET
	# @return 200 with user record
	# @return 401 if password does not match user
	#
	get '/api/whoami' do
		user = user_from_token
		unauthorized if user.nil?
		json user
	end

	#################################################################
	## Volumes
	#################################################################

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
		json settings.volumes.mount(volume_from_id(params[:volume_id]))
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
		json settings.volumes.unmount(volume_from_id(params[:volume_id]))
	end

	#################################################################
	## Documents
	#################################################################

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
	# @return 200 updated file record
	# @return 403 file is locked
	#
	put '/api/volumes/:volume_id/files/:filename' do
		json documents(params[:volume_id]).get(params[:filename]).create(request.body.read)
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
	# Lock Document
	#
	# @method PUT
	# @param volume_id storage volume
	# @param filename
	# @return 200 updated file record
	#
	put '/api/volumes/:volume_id/files/:filename/lock' do
		json documents(params[:volume_id]).get(params[:filename]).lock
	end

	##
	# Unlock Document
	#
	# @method PUT
	# @param volume_id storage volume
	# @param filename
	# @return 200 updated file record
	#
	put '/api/volumes/:volume_id/files/:filename/unlock' do
		json documents(params[:volume_id]).get(params[:filename]).unlock
	end

	#################################################################
	## Slideshows
	#################################################################

	##
	# Get Slideshow Sets on a Volume
	#
	# @method GET
	# @param volume_id storage volume
	# @return 200 list of image sets
	#
	get '/api/volumes/:volume_id/slides/?' do
		volume_id = params[:volume_id]
		volumes = (volume_id == Volume::ANY) ? settings.volumes.list : volume_from_id(volume_id)
		json SlideSetList.create(*volumes)
	end

	##
	# Get Slideshow Set on a Volume
	#
	# @method GET
	# @param volume_id storage volume
	# @param set_id slideshow set
	# @return 200 slideshow set
	#
	get '/api/volumes/:volume_id/slides/:set_id/?' do
		volume_id = params[:volume_id]
		set_id = params[:set_id]
		volumes = (volume_id == Volume::ANY) ? settings.volumes.list : volume_from_id(volume_id)
		json SlideSetList.create(*volumes)[set_id]
	end

	##
	# Get Slideshow Set Images on a Volume
	#
	# @method GET
	# @param volume_id storage volume
	# @param set_id slideshow set
	# @return 200 list of random images
	#
	get '/api/volumes/:volume_id/slides/:set_id/images/?' do
		volume_id = params[:volume_id]
		set_id = params[:set_id]
		volumes = (volume_id == Volume::ANY) ? settings.volumes.list : volume_from_id(volume_id)
		json SlideSetList.create(*volumes)[set_id].images.shuffle
	end

	##
	# Get Slideshow Image in a Set on a Volume
	#
	# @method GET
	# @param volume_id storage volume
	# @param set_id slideshow set
	# @param filename filename
	# @return 200 image
	#
	get '/api/volumes/:volume_id/slides/:set_id/images/:filename' do
		volume_id = params[:volume_id]
		set_id = params[:set_id]
		volumes = (volume_id == Volume::ANY) ? settings.volumes.list : volume_from_id(volume_id)
		image = SlideSetList.create(*volumes)[set_id].image(params[:filename])
		cache_control :public, :max_age => 60 * 60
		send_file(image.path, :type => image.type)
	end

	#################################################################
	## Networks
	#################################################################

	##
	# List Available Networks
	#
	# @method GET
	# @return 200 list of available networks
	#
	get '/api/networks/available/?' do
		json settings.networks.available
	end

	##
	# Scan Wireless Networks
	#
	# @method GET
	# @return 200 list of nearby wireless networks
	#
	get '/api/networks/:interface/scan/?' do
		json settings.networks.scan_wireless(params[:interface])
	end

	##
	# Connect Wireless Network
	#
	# @method POST
	# @param interface
	# @param ssid
	# @param password
	# @return 200 network status
	#
	post '/api/networks/:interface/connect/?' do
		json settings.networks.connect(params[:interface], @request_json[:ssid], @request_json[:password])
	end

	##
	# Disconnect Wireless Network
	#
	# @method POST
	# @param interface
	# @return 200 network status
	#
	post '/api/networks/:interface/disconnect/?' do
		json settings.networks.disconnect(params[:interface])
	end

	##
	# List Known Wireless Networks
	#
	# @method POST
	# @param interface
	# @return 200 list of wireless networks
	#
	post '/api/networks/:interface/known/?' do
		json settings.networks.list_known(params[:interface])
	end

	##
	# Forget Wireless Network
	#
	# @method POST
	# @param interface
	# @param ssid
	# @return 200 network status
	#
	post '/api/networks/:interface/forget/?' do
		json settings.networks.forget_known(params[:interface], @request_json[:ssid])
	end
end
