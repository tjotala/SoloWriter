require 'spec_helper'
require 'password'

describe Password do
	it "should require password" do
		expect{ Password.create(nil) }.to raise_error(ArgumentError)
	end

	it "should reject invalid passwords" do
		expect{ Password.create("h") }.to raise_error(ArgumentError)
		expect{ Password.create(" ") }.to raise_error(ArgumentError)
		expect{ Password.create("ha") }.to raise_error(ArgumentError)
		expect{ Password.create("h ") }.to raise_error(ArgumentError)
		expect{ Password.create(" h") }.to raise_error(ArgumentError)
		expect{ Password.create("ham") }.not_to raise_error
	end

	it "should create a valid new password" do
		pw = Password.create("hammer")
		expect( pw.to_s ).not_to eq("hammer")
		expect( pw.match?("hammer") ).to be true
	end

	it "should not strip blanks anywhere in the password" do
		expect( Password.create(" hammer").match?(" hammer") ).to be true
		expect( Password.create("hammer ").match?("hammer ") ).to be true
		expect( Password.create(" hammer ").match?(" hammer ") ).to be true
		expect( Password.create("ham mer").match?("ham mer") ).to be true
	end

	it "should ensure two identical passwords yield different hashed passwords" do
		pw1 = Password.create("hammer")
		pw2 = Password.create("hammer")
		expect( pw1 ).not_to eq(pw2)
	end

	it "should encode and decode" do
		pw1 = Password.create("hammer")
		pw2 = Password.decode(pw1.encode)
		expect( pw2 ).to eq(pw1)
	end

	it "should fail to decode garbage" do
		expect{ Password.decode("this is garbage") }.to raise_error(ArgumentError)
		expect{ Password.decode(Base64::urlsafe_encode64("this is garbage")) }.to raise_error(ArgumentError)
	end
end
