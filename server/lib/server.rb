%w[ volumes documents networks ].each { |file| Platform::require_lib file }

class SoloServer < Sinatra::Base
	configure do
		set :root, Platform::ROOT_PATH
		set :public_folder, Proc.new { File.join(root, '..', 'web_ui') }
		enable :static
		enable :logging
		set :static_cache_control, [ :public, :max_age => 60 ]
		set :doc_folder, Proc.new { File.join(root, '..', 'docs') }
		set :port, 8080
		set :bind, '0.0.0.0' # allow access from other hosts
	end

	before do
		# we don't want the client to cache these API responses
		cache_control :public, :no_store
	end

	get '/' do
		cache_control :public, :max_age => 60
		send_file(File.join(settings.public_folder, 'index.html'))
	end

	get '/api/volumes/?' do
		json Volumes::list
	end

	get '/api/networks/?' do
		json Networks::list
	end

	get '/api/files/?' do
		json Documents::list(settings.doc_folder)
	end

	get '/api/files/:file' do
		send_file(Document.relative(params['file'], settings.doc_folder).full_path, :type => :text, :status => 200)
	end

	put '/api/files/:file' do
		Document.relative(params['file'], settings.doc_folder).write(request.body.read)
		status 204
	end

	delete '/api/files/:file' do
		Document.relative(params['file'], settings.doc_folder).remove
		status 204
	end

	get '/api/quit' do
		settings.browser.shutdown
		Platform::quit
		status 204 # probably won't even get here
	end

	get '/api/shutdown' do
		settings.browser.shutdown
		Platform::shutdown
		status 204 # probably won't even get here
	end
end
