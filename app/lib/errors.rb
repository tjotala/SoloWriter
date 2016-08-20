class AuthenticationError < RuntimeError
end

class TokenError < RuntimeError
end

def unauthorized
	raise AuthenticationError, "invalid credentials"
end

def forbidden
	raise AuthenticationError, "forbidden operation"
end

def invalid_token
	raise TokenError #, "invalid token"
end

def not_implemented
	raise NotImplementedError
end

def missing_argument(arg)
	raise ArgumentError, "#{arg} is required"
end

def invalid_argument(arg, reason)
	raise ArgumentError, "invalid #{arg}: #{reason}"
end
