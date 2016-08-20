require 'spec_helper'
require 'json'
require 'networks'

describe Networks do
	it "should produce a list" do
		expect( Networks.new.list ).to be_a(Array)
	end

	it "should produce a valid JSON list" do
		expect( JSON.parse(Networks.new.to_json) ).to be_a(Array)
	end
end
