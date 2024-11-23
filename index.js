const express = require('express');
const path = require('path'); 
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const SimpleWebAuthnServer = require('@simplewebauthn/server');
const base64url = require('base64url');
app.use(cors({ origin: '*' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
let users = {};
let challenges = {};
const rpId = 'localhost';
const expectedOrigin = ['http://localhost:3000'];
app.listen(process.env.PORT || 3000, err => {
    if (err) throw err;
    console.log('Server started on port', process.env.PORT || 3000);
});
app.use(express.static(path.join(__dirname, 'passkey-frontend/dist/passkey-frontend/browser')));



app.post('/register/start', (req, res) => {
    let username = req.body.username;
    console.log(`Received registration request for username: ${username}`);

    let challenge = getNewChallenge();
    console.log(`Generated new challenge: ${challenge}`);

    challenges[username] = convertChallenge(challenge);
    console.log(`Stored challenge for username: ${username}`);

    const pubKey = {
        challenge: challenge,
        rp: {id: rpId, name: 'webauthn-app'},
        user: {id: username, name: username, displayName: username},
        pubKeyCredParams: [
            {type: 'public-key', alg: -7},
            {type: 'public-key', alg: -257},
        ],
        authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
            requireResidentKey: false,
        }
    };

    console.log(`Sending public key credentials: ${JSON.stringify(pubKey)}`);

    res.json(pubKey);
});

app.post('/register/finish', async (req, res) => {
    const username = req.body.username;
    console.log(`Received registration finish request for username: ${username}`);

    // Verify the attestation response
    let verification;
    try {
        console.log('Verifying registration response...');
        verification = await SimpleWebAuthnServer.verifyRegistrationResponse({
            response: req.body.data,
            expectedChallenge: challenges[username],
            expectedOrigin: expectedOrigin
        });
        console.log('Registration verification completed');
    } catch (error) {
        console.error(`Error during registration verification: ${error.message}`);
        return res.status(400).send({error: error.message});
    }

    const {verified, registrationInfo} = verification;
    if (verified) {
        console.log(`Registration successful for username: ${username}`);
        users[username] = registrationInfo;
        return res.status(200).send(true);
    }

    console.log(`Registration failed for username: ${username}`);
    res.status(500).send(false);
});




app.post('/login/start', (req, res) => {
    let username = req.body.username;
    console.log('Login start for:', username);
    
    if (!users[username]) {
        console.log('User not found for username:', username);
        return res.status(404).send(false);
    }

    let challenge = getNewChallenge();
    challenges[username] = convertChallenge(challenge);
    console.log('Generated challenge:', challenge);

    const responsePayload = {
        challenge,
        rpId,
        allowCredentials: [{
            type: 'public-key',
            id: users[username].credentialID,
            transports: ['internal'],
        }],
        userVerification: 'preferred',
    };

    console.log('Sending challenge response:', responsePayload);
    res.json(responsePayload);
});


app.post('/login/finish', async (req, res) => {
    let username = req.body.username;
    console.log('Login finish for:', username);

    if (!users[username]) {
        console.log('User not found for username:', username);
        return res.status(404).send(false);
    }

    console.log('Received authentication response:', req.body.data);
    let verification;
    try {
        const user = users[username];
        verification = await SimpleWebAuthnServer.verifyAuthenticationResponse({
            expectedChallenge: challenges[username],
            response: req.body.data,
            authenticator: user,
            expectedRPID: rpId,
            expectedOrigin,
            requireUserVerification: false
        });

        console.log('Verification result:', verification);
    } catch (error) {
        console.error('Verification error:', error);
        return res.status(400).send({ error: error.message });
    }

    const { verified } = verification;
    console.log('Login verified:', verified);

    return res.status(200).send({ res: verified });
});


function getNewChallenge() {
    return Math.random().toString(36).substring(2);
}
function convertChallenge(challenge) {
    return btoa(challenge).replaceAll('=', '');
}