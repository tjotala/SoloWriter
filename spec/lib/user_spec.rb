require 'spec_helper'
require 'user'

describe User do
	def delay
		sleep(10.0 / 1000)
	end

	context "with bad inputs" do
		it "should require username" do
			expect{ User.create(nil, nil) }.to raise_error(ArgumentError)
		end

		it "should require password" do
			expect{ User.create("thor", nil) }.to raise_error(ArgumentError)
		end
	end

	context "with valid inputs" do
		subject(:user) { User.create("thor", "hammer") }

		it "should result in a valid new user" do
			before_now = Time.now.utc
			expect( user.username.to_s ).to eq("thor")
			expect( user.password ).not_to be_nil
			expect( user.last_modified ).to be > before_now
			expect( user.last_login ).to be nil
		end

		it "should allow changing username" do
			last_modified = user.last_modified
			delay
			expect( user.new_username("loki").username.to_s ).to eq("loki")
			expect( user.last_modified ).to be > last_modified
		end

		it "should validate password" do
			expect( user.password?("hammer") ).to be true
			expect( user.password?("!hammer") ).to be false
		end

		it "should allow changing password" do
			old_password = user.password
			last_modified = user.last_modified
			delay
			user.new_password("hammer")
			expect( user.password ).not_to eq(old_password) # should not match because salt is different
			expect( user.password?("hammer") ).to be true
			expect( user.last_modified ).to be > last_modified
		end

		it "should encode to minimal public JSON" do
			json = JSON.parse(user.to_json)
			expect( json.keys ).to contain_exactly('username', 'last_modified', 'last_login')
			expect( json['username'] ).to eq("thor")
		end

		it "should encode and decode correctly" do
			user2 = User.decode(user.encode)
			expect( user2 ).to eq(user)
		end

		it "should generate new token" do
			last_login = Time.now.utc
			token = user.new_token
			expect( user.last_login ).to be > last_login
		end

		it "should timestamp last modification" do
			last_modified = user.last_modified
			delay
			user.touch
			expect( user.last_modified ).to be > last_modified
		end

		it "should save itself" do
			user.save
			expect( File.exist?(user.path) ).to be true
		end

		it "should delete itself" do
			user.save
			expect( File.exist?(user.path) ).to be true
			user.delete
			expect( File.exist?(user.path) ).to be false
		end

		it "should fail delete if file is not there" do
			expect( File ).to receive(:delete).and_raise(Errno::ENOENT)
			expect{ user.delete }.to raise_error(ArgumentError)
		end

		it "should fail delete if file is inaccessible" do
			expect( File ).to receive(:delete).and_raise(Errno::EACCES)
			expect{ user.delete }.to raise_error(InternalError)
		end

		it "should provide root path" do
			expect( user.path ).to start_with(Platform::USERS_PATH).and include(user.username.to_s)
		end
	end

	it "should provide root path" do
		expect( User.path("thor") ).to start_with(Platform::USERS_PATH).and include("thor")
	end
end
