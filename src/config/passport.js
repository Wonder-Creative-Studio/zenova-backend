import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import passport from 'passport';
import config from './config';
import User from '~/models/userModel';

// Custom extractor: check cookies first, then Authorization header
const cookieExtractor = (req) => {
	if (req && req.cookies && req.cookies.accessToken) {
		return req.cookies.accessToken;
	}
	// Fallback to Authorization header
	return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
};

passport.use(
	new JwtStrategy(
		{
			jwtFromRequest: cookieExtractor,
			secretOrKey: config.JWT_ACCESS_TOKEN_SECRET_PUBLIC,
			algorithms: ['RS256']
		},
		async (jwtPayload, done) => {
			try {
				const user = await User.getUserById(jwtPayload.sub);
				if (!user) {
					return done(null, false);
				}
				return done(null, user);
			} catch (err) {
				return done(err, false);
			}
		}
	)
);

export default passport;


// import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
// import passport from 'passport';
// import config from './config';
// import User from '~/models/userModel';

// passport.use(
//   new JwtStrategy(
//     {
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//       secretOrKey: config.JWT_ACCESS_TOKEN_SECRET_PUBLIC,
//       algorithms: ['RS256']
//     },
//     async (jwtPayload, done) => {
//       // DEBUG 1 — full payload
//       console.log("🔵 [passport] Decoded JWT Payload:", jwtPayload);

//       // DEBUG 2 — what we're passing to DB lookup
//       console.log("🟡 [passport] User ID (jwtPayload.sub):", jwtPayload?.sub);

//       try {
//         const user = await User.getUserById(jwtPayload.sub);

//         // DEBUG 3 — DB result
//         console.log("🟢 [passport] DB Result (user):", user);

//         if (!user) {
//           console.log("🔴 [passport] No user found for ID:", jwtPayload.sub);
//           return done(null, false);
//         }

//         console.log("🟢 [passport] Authenticated User ID:", user.id || user._id);
//         return done(null, user);
//       } catch (err) {
//         console.log("🔴 [passport] ERROR while fetching user:", err);
//         return done(err, false);
//       }
//     }
//   )
// );

// export default passport;
