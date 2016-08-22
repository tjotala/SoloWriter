require 'promise'

require 'errors'
require 'user'

class Users
	def list
		Dir[User.path('*')].map { |path| User.from_path(path) }
	end

	def validate(username, password)
		user = User.from_name(username)
		unauthorized unless user.password?(password)
		user
	end

	def new_token(username, password)
		user = validate(username, password)
		token = user.new_token
		user.save
		token
	end

	def from_token(token)
		User.from_token(token)
	end

	def create(username, password)
		forbidden if User.exist?(username)
		User.create(username, password).save
	end

	def update_username(username, password, new_username)
		user = validate(username, password)
		user.delete
		create(new_username, password)
	end

	def update_password(username, password, new_password)
		user = validate(username, password)
		forbidden if user.password?(new_password) # new_password == old_password
		user.new_password(new_password).save
	end

	def delete(username, password)
		user = validate(username, password)
		user.delete
	end
end
