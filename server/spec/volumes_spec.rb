require 'volumes'

describe Volumes do
	it "should produce a list of volumes" do
		expect(Volumes::list).to be_a(Array)
	end
end
