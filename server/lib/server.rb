%w[ volumes documents networks ].each { |inc| require_relative inc }

class SoloServer < Sinatra::Base
	configure do
		set :root, File.dirname(File.expand_path(__FILE__))
		set :public_folder, Proc.new { File.join(root, '..', '..', 'web_ui') }
		enable :static
		enable :logging
		set :doc_folder, Proc.new { File.join(root, '..', '..', 'docs') }
		set :port, 8080
		set :bind, '0.0.0.0' # allow access from other hosts
		set :kiosk, (RUBY_PLATFORM == "arm-linux-gnueabihf")
	end

	get '/' do
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
		if settings.kiosk
			Process.kill('TERM', settings.browser_pid)
		end
		Process.kill('TERM', Process.pid)
		status 204
	end

	get '/api/shutdown' do
		exec("sudo shutdown -h now")
		status 204
	end
end
