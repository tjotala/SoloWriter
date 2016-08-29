require 'spec_helper'
require 'json'
require 'networks'

describe Networks do
	it "should produce a list of available networks" do
		expect( Networks.new.available ).to be_a(Array)
	end

	it "should produce a list of wireless networks" do
		expect( Networks.new.scan_wireless('wlan0') ).to be_a(Array)
	end

	it "should produce a valid JSON list of available networks" do
		expect( JSON.parse(Networks.new.available.to_json) ).to be_a(Array)
	end

	it "should produce a valid JSON list of wireless networks" do
		expect( JSON.parse(Networks.new.scan_wireless('wlan0').to_json) ).to be_a(Array)
	end
end
