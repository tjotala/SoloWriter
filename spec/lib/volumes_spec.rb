require 'spec_helper'
require 'json'
require 'volumes'

describe Volumes do
	it "should produce a list" do
		expect( Volumes.new.list ).to be_a(Array)
	end

	it "should produce a valid JSON list" do
		expect( JSON.parse(Volumes.new.to_json) ).to be_a(Array)
	end
end
