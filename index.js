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
    console.log(users[username]);
    let challenge = getNewChallenge();
    challenges[username] = convertChallenge(challenge);
    console.log('Generated challenge:', challenge);

    const responsePayload = {
        challenge,
        rpId,
        allowCredentials: [{
            type: 'public-key',
            id: users[username].credential.id,//change the code
            transports: ['internal'],
        }],
        userVerification: 'preferred',
    };

    console.log('Sending challenge response:', responsePayload);
    res.json(responsePayload);
});



app.post('/login/finish', async (req, res) => {
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const username = req.body.username;

    // Validate if user exists
    if (!users[username]) {
        console.error("User not found:", username);
        return res.status(404).send(false);
    }

    // Extract authenticator data from request
    const data = req.body.data;

    // Manually build the authenticator object
    const authenticator = {
        id: data.id, // This is the credential ID from the client
        counter: 0, // Default to 0 if no counter is provided (adjust as per your implementation)
    };

    console.log("Authenticator object:", authenticator);

    let verification;
    try {
        const user = users[username];
        console.log("User credentials:", JSON.stringify(user, null, 2));

        verification = await SimpleWebAuthnServer.verifyAuthenticationResponse({
            expectedChallenge: challenges[username], // Challenge sent during the initial request
            response: data, // Directly pass the data object as received
            authenticator: {
                credentialPublicKey: user.credential.publicKey.buffer, // User's public key buffer
                credentialID: base64url.toBuffer(authenticator.id), // Convert the credential ID to buffer
                counter: authenticator.counter, // Provide the counter value
            },
            expectedRPID: rpId, // Your relying party ID
            expectedOrigin, // Your origin (e.g., http://localhost:3000)
            requireUserVerification: false, // Adjust based on your verification needs
        });
    } catch (error) {
        console.error("Verification failed:", error);
        return res.status(400).send({ error: error.message });
    }

    const { verified } = verification;

    console.log("Verification result:", verified);

    return res.status(200).send({
        res: verified,
    });
});



// app.post('/login/finish', async (req, res) => {
//     console.log("reqf",req.body);
//     let username = req.body.username;
//     if (!users[username]) {
//        return res.status(404).send(false);
//     }
//     const authenticator = req.body.authenticator;
//     console.log('Authenticator', authenticator);
//     let verification;
//     try {
//         const user = users[username];
//         verification = await SimpleWebAuthnServer.verifyAuthenticationResponse({
//             expectedChallenge: challenges[username],
//             response: req.body.data,
//             authenticator: {
//                 credentialPublicKey: user.credential.publicKey.buffer,
//                 credentialID: base64url.toBuffer(authenticator.credential.id),
//                 counter: authenticator.counter,   
//             },
//             expectedRPID: rpId,
//             expectedOrigin,
//             requireUserVerification: false
//         });
//     } catch (error) {
//         console.error(error);
//         return res.status(400).send({error: error.message});
//     }
//     const {verified} = verification;
//     return res.status(200).send({
//         res: verified
//     });
// });


function getNewChallenge() {
    return Math.random().toString(36).substring(2);
}
function convertChallenge(challenge) {
    return btoa(challenge).replaceAll('=', '');
}