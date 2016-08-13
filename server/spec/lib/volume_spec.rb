require 'spec_helper'
require 'json'
require 'securerandom'
require 'volume'

describe Volume do
	it "should require id" do
		expect{ Volume.new() }.to raise_error(ArgumentError)
	end

	it "should require type" do
		expect{ Volume.new({ id: SecureRandom.uuid }) }.to raise_error(ArgumentError)
	end

	it "should require name" do
		expect{ Volume.new({ id: SecureRandom.uuid, type: 'vfat' }) }.to raise_error(ArgumentError)
	end

	it "should require label" do
		expect{ Volume.new({ id: SecureRandom.uuid, type: 'vfat', name: 'mockvolume' }) }.to raise_error(ArgumentError)
	end
end
