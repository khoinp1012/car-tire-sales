import { Client, Users, ID, Query } from 'node-appwrite';
import { OAuth2Client } from 'google-auth-library';

export default async ({ req, res, log, error }) => {
    log('--- Function Execution Started ---');

    // 0. Check Environment Variables
    const {
        GOOGLE_CLIENT_ID,
        APPWRITE_ENDPOINT,
        APPWRITE_PROJECT_ID,
        APPWRITE_API_KEY
    } = process.env;

    if (!GOOGLE_CLIENT_ID || !APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
        const missing = [];
        if (!GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
        if (!APPWRITE_ENDPOINT) missing.push('APPWRITE_ENDPOINT');
        if (!APPWRITE_PROJECT_ID) missing.push('APPWRITE_PROJECT_ID');
        if (!APPWRITE_API_KEY) missing.push('APPWRITE_API_KEY');

        error(`Missing environment variables: ${missing.join(', ')}`);
        return res.json({
            success: false,
            error: `Configuration error: Missing ${missing.join(', ')}`
        }, 500);
    }

    try {
        // Parse request body
        let body;
        if (typeof req.body === 'string') {
            try {
                body = JSON.parse(req.body);
            } catch (e) {
                error('Failed to parse req.body as JSON');
                return res.json({ success: false, error: 'Invalid JSON body' }, 400);
            }
        } else {
            body = req.body || {};
        }

        const { idToken } = body;

        if (!idToken) {
            error('No ID token provided in request');
            return res.json({
                success: false,
                error: 'ID token is required'
            }, 400);
        }

        log(`Verifying Google ID token for Client ID: ${GOOGLE_CLIENT_ID.substring(0, 10)}...`);

        // 1. Verify ID token with Google
        const client = new OAuth2Client(GOOGLE_CLIENT_ID);

        let ticket;
        try {
            log('Calling Google verifyIdToken...');
            ticket = await client.verifyIdToken({
                idToken,
                audience: GOOGLE_CLIENT_ID,
            });
            log('Google verification successful!');
        } catch (err) {
            error(`Google verification failed: ${err.message}`);
            return res.json({
                success: false,
                error: `Invalid Google token: ${err.message}`
            }, 401);
        }

        const payload = ticket.getPayload();
        const { email, name } = payload;

        log(`Verified Google user: ${email}`);

        // 2. Initialize Appwrite client
        const appwriteClient = new Client()
            .setEndpoint(APPWRITE_ENDPOINT)
            .setProject(APPWRITE_PROJECT_ID)
            .setKey(APPWRITE_API_KEY);

        const users = new Users(appwriteClient);

        // 3. Find or create user
        let user;
        try {
            log(`Searching for existing user with email: ${email}`);
            const userList = await users.list([
                Query.equal('email', [email])
            ]);

            if (userList.total > 0) {
                user = userList.users[0];
                log(`Found existing user: ${user.$id}`);
            } else {
                log('Creating new user...');
                user = await users.create(
                    ID.unique(),
                    email,
                    undefined, // phone
                    undefined, // password
                    name
                );
                log(`Created new user: ${user.$id}`);
            }
        } catch (err) {
            error(`Appwrite Users API error: ${err.message}`);
            return res.json({
                success: false,
                error: `Failed to manage user: ${err.message}`
            }, 500);
        }

        // 4. Create session token (secret)
        log(`Generating session token for user: ${user.$id}`);
        try {
            const token = await users.createToken(user.$id);
            log('Session token generated successfully');

            // 5. Return success
            return res.json({
                success: true,
                userId: user.$id,
                secret: token.secret,
                email: user.email,
                name: user.name,
            });
        } catch (err) {
            error(`Appwrite Token API error: ${err.message}`);
            return res.json({
                success: false,
                error: `Failed to create session: ${err.message}`
            }, 500);
        }

    } catch (err) {
        error(`Unexpected Function Error: ${err.stack || err.message}`);
        return res.json({
            success: false,
            error: 'Internal function error'
        }, 500);
    }
};
