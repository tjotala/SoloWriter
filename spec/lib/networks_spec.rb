require 'spec_helper'
require 'json'
require 'networks'

describe Networks do
	it "should produce a list of active networks" do
		expect( Networks.new.active ).to be_a(Array)
	end

	it "should produce a list of wireless networks" do
		expect( Networks.new.wireless ).to be_a(Array)
	end

	it "should produce a valid JSON list of active networks" do
		expect( JSON.parse(Networks.new.active.to_json) ).to be_a(Array)
	end

	it "should produce a valid JSON list of wireless networks" do
		expect( JSON.parse(Networks.new.wireless.to_json) ).to be_a(Array)
	end
end
