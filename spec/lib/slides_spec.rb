require 'spec_helper'
require 'json'
require 'slides'
require 'volumes'

describe SlideSetList do
	before(:each) do
		FakeFS.deactivate!
	end

	after(:each) do
		FakeFS.activate!
	end

	it "should produce a list of at least one" do
		expect( SlideSetList.create(Volumes.new.local).count ).to be >= 1
	end

	it "should produce a valid JSON list" do
		expect( JSON.parse(SlideSetList.create(Volumes.new.local).to_json) ).to be_a(Array)
	end
end
