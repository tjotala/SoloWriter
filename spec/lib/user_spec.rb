require 'spec_helper'
require 'user'

describe User do
	let(:uuid) { SecureRandom.uuid }

	def delay
		sleep(5.0 / 1000)
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
			now = Time.now.utc
			delay
			expect( user.id.to_s ).to be_a_uuid
			expect( user.username.to_s ).to eq("thor")
			expect( user.password ).not_to be_nil
			expect( user.last_modified ).to be > now
			expect( user.last_modified.utc? ).to be true
			expect( user.last_login ).to be nil
		end

		context "when changing username" do
			it "should change username" do
				expect{ user.new_username("loki") }.to change{ user.username }
			end

			it "should change last_modified" do
				user.touch
				delay
				expect{ user.new_username("loki") }.to change{ user.last_modified }
			end

			it "should not change id" do
				expect{ user.new_username("loki") }.not_to change{ user.id }
			end

			it "should not change password" do
				expect{ user.new_username("loki") }.not_to change{ user.password }
			end

			it "should not change last_login" do
				expect{ user.new_username("loki") }.not_to change{ user.last_login }
			end
		end

		context "when changing password" do
			it "should change password" do
				expect{ user.new_password("mjolnir") }.to change{ user.password }
			end

			it "should change password (salt), even if same as original" do
				expect{ user.new_password("hammer") }.to change{ user.password }
			end

			it "should change last_modified" do
				user.touch
				delay
				expect{ user.new_password("hammer") }.to change{ user.last_modified }
			end

			it "should not change id" do
				expect{ user.new_password("hammer") }.not_to change{ user.id }
			end

			it "should not change username" do
				expect{ user.new_password("hammer") }.not_to change{ user.username }
			end

			it "should not change last_login" do
				expect{ user.new_password("hammer") }.not_to change{ user.last_login }
			end
		end

		it "should validate password" do
			expect( user.password?("hammer") ).to be true
			expect( user.password?("!hammer") ).to be false
		end

		it "should encode to minimal public JSON" do
			json = JSON.parse(user.to_json)
			expect( json.keys ).to contain_exactly('id', 'username', 'last_modified', 'last_login')
			expect( json['username'] ).to eq("thor")
		end

		context "when encoding and decoding" do
			it "should handle roundtrip" do
				user2 = User.decode(user.encode)
				expect( user2 ).to eq(user)
			end

			it "should reject garbage" do
				expect{ User.decode("this is garbage") }.to raise_error(ArgumentError)
			end

			it "should decode from token" do
				user.save
				token = Token.create(user.id)
				expect( User.from_token(token.encode) ).to eq(user)
			end
		end

		context "when resolving id" do
			it "should succeed with known id" do
				user.save
				expect( User.from_id(user.id) ).to eq(user)
			end

			it "should fail with unknown id" do
				expect{ User.from_id(SecureRandom.uuid) }.to raise_error(NoSuchResourceError)
			end
		end

		context "when resolving username" do
			it "should succeed with known username" do
				user.save
				expect( User.from_name(user.username.to_s) ).to eq(user)
			end

			it "should fail with unknown username" do
				expect{ User.from_name("odin") }.to raise_error(NoSuchResourceError)
			end

			it "should find a known username" do
				user.save
				expect( User.exist?(user.username.to_s) ).to be true
			end

			it "should not find a unknown username" do
				expect( User.exist?("odin") ).to be false
			end
		end

		context "when generating new token" do
			it "should only change last_login" do
				delay
				expect{ user.new_token }.to change{ user.last_login }
			end

			it "should not change id" do
				expect{ user.new_token }.not_to change{ user.id }
			end

			it "should not change username" do
				expect{ user.new_token }.not_to change{ user.username }
			end

			it "should not change password" do
				expect{ user.new_token }.not_to change{ user.password }
			end

			it "should not change last_modified" do
				user.touch
				expect{ user.new_token }.not_to change{ user.last_modified }
			end
		end

		it "should timestamp last modification" do
			user.touch
			delay
			expect{ user.touch }.to change { user.last_modified }
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

		it "should list users" do
			expect( User.list ).to be_empty
			user.save
			expect( User.list ).to contain_exactly(user)
		end

		it "should return path to user record" do
			expect( user.path ).to start_with(Platform::USERS_PATH).and include(user.id)
		end
	end

	it "should return root path for any user record" do
		expect( User.path(uuid) ).to start_with(Platform::USERS_PATH).and include(uuid)
	end
end
