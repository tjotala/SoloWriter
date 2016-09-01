require 'spec_helper'
require 'server'

describe SoloServer do
	before(:each) do
		FakeFS.deactivate!
	end

	after(:each) do
		FakeFS.activate!
	end

	it "should return homepage" do
		get "/"
		expect( last_response ).to be_ok
		expect( last_response ).to be_html
	end

	it "should respond to ping" do
		get "/api/ping"
		expect( last_response ).to be_ok
		expect( last_response ).to be_plain_text
		expect( last_response.body ).to eq("ok")
	end

	it "should respond to configuration request" do
		get "/api/config"
		expect( last_response ).to be_ok
		expect( last_response ).to be_json
	end

	it "should quit" do
		expect( Kernel ).to receive(:sleep) # and eat it
		expect( Platform ).to receive(:quit) # and eat it
		expect( Thread ).to receive(:new).and_yield # don't spawn the background thread
		post "/api/quit"
		expect( last_response ).to be_empty
	end

	it "should shutdown" do
		allow( Kernel ).to receive(:sleep) # and eat it
		expect( Platform ).to receive(:shutdown) # and eat it
		expect( Thread ).to receive(:new).and_yield # don't spawn the background thread
		post "/api/shutdown"
		expect( last_response ).to be_empty
	end

	it "should return not found JSON to garbage URL" do
		get "/#{Uuid.new_uuid}"
		expect( last_response ).to be_not_found
		expect( last_response ).to be_json
	end
end
