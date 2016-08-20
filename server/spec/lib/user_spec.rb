require 'spec_helper'
require 'user'

describe User do
	it "should require username" do
		expect{ User.create(nil, nil) }.to raise_error(ArgumentError)
	end

	it "should require password" do
		expect{ User.create("thor", nil) }.to raise_error(ArgumentError)
	end

	it "should create a valid new user" do
		user = User.create("thor", "hammer")
		expect( user.username.to_s ).to eq("thor")
		expect( user.password ).not_to be_nil
	end

	it "should validate password" do
		user = User.create("thor", "hammer")
		expect( user.password?("hammer") ).to be true
		expect( user.password?("!hammer") ).to be false
	end

	it "should generate new salt when changing password" do
		user = User.create("thor", "hammer")
		old_password = user.password
		user.new_password("hammer")
		expect( user.password ).not_to eq(old_password) # should not match because salt is different
		expect( user.password?("hammer") ).to be true
	end

	it "should encode to minimal public JSON" do
		user = User.create("thor", "hammer")
		json = JSON.parse(user.to_json)
		expect( json.keys ).to contain_exactly('username')
		expect( json['username'] ).to eq("thor")
	end

	it "should encode and decode correctly" do
		user1 = User.create("thor", "hammer")
		user2 = User.decode(user1.encode)
		expect( user2 ).to eq(user1)
	end

	it "should provide root path" do
		expect( User.path("thor") ).to start_with(Platform::USERS_PATH)
	end
end
