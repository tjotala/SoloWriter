require 'spec_helper'
require 'username'

describe Username do
	it "should require username" do
		expect{ Username.create(nil) }.to raise_error(ArgumentError)
	end

	it "should create a valid new username" do
		un = Username.create("thor")
		expect( un.to_s ).to eq("thor")
	end

	it "should encode and decode correctly" do
		un1 = Username.create("thor")
		un2 = Username.decode(un1.encode)
		expect( un2 ).to eq(un1)
	end
end
