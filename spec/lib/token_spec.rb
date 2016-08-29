require 'spec_helper'
require 'token'

describe Token do
	let(:uuid) { SecureRandom.uuid }
	it "should create new valid token" do
		token = Token.create(uuid)
		expect( token ).to be_a(Token)
		expect( token.id ).to be_uuid
		expect( token.id ).to eq(uuid)
		expect( token.created.utc? ).to be true
		expect( token.created.subsec ).to be == 0
		expect( token.created ).to be <= Time.now.round(0)
		expect( token.expires.utc? ).to be true
		expect( token.expires.subsec ).to be == 0
		expect( token.expires ).to be > Time.now
		expect( token.expired? ).to be false
	end

	it "should encode and decode" do
		token = Token.create(uuid)
		decoded = Token.decode(token.encode)
		expect( token ).to eq(decoded)
	end

	it "should fail to decode garbage" do
		expect{ Token.decode("garbage") }.to raise_error(TokenError)
	end
end
