require 'spec_helper'
require 'json'
require 'volumes'
require 'local_volume'

describe LocalVolume do
	it "should be valid" do
		expect{ LocalVolume.new }.not_to raise_error
	end

	it "should have correct ID" do
		expect( LocalVolume.new.id ).to eq(LocalVolume::ID)
		expect( Volumes.new.local?(LocalVolume.new.id) ).to be true
	end

	it "should have correct name" do
		expect( LocalVolume.new.name ).to eq(Platform::PRODUCT_NAME)
	end

	it "should have correct path" do
		expect( LocalVolume.new.path ).to eq(Platform::LOCAL_PATH)
	end

	it "should be mounted" do
		expect( LocalVolume.new.mounted? ).to be true
	end

	it "should fail to mount" do
		expect( LocalVolume.new.mountable? ).to be false
		expect( LocalVolume.new ).not_to respond_to(:mount)
	end

	it "should fail to unmount" do
		expect( LocalVolume.new.unmountable? ).to be false
		expect( LocalVolume.new ).not_to respond_to(:unmount)
	end

	it "should render as JSON" do
		expect{ JSON.parse(LocalVolume.new.to_json) }.not_to raise_error
	end
end
