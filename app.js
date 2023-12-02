const express = require('express');
const app = express();
const { Octokit } = require("@octokit/rest");
const sodium = require('libsodium-wrappers');

const octokit = new Octokit({
  auth: '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'
})
app.use(express.static('public'));
app.use(express.json());       
app.use(express.urlencoded({extended: true})); 

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

async function get_public_keys() {
  const { data: keys } = await octokit.request('GET /repos/{owner}/{repo}/actions/secrets/public-key', {
  owner: 'novaeon',
  repo: 'toddlescraper',
  headers: {
    'X-GitHub-Api-Version': '2022-11-28'
  }
  })
  return keys;
}

async function insert_secret(MySecret, MySecretName, MyKeyId) {

  const response = await octokit.request('PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}', {
    owner: 'novaeon',
    repo: 'toddlescraper',
    secret_name: MySecretName,
    encrypted_value: MySecret,
    key_id: MyKeyId,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }

  })

  if (response.status == 201 || response.status == 204) {
    console.log('Request was successful');
  } else {
      console.log('Request failed with status code: ', response.status);
  }

}

function encryptSecret(key, secret) {
  // Convert the secret and key to a Uint8Array.
  let binkey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
  let binsec = sodium.from_string(secret);

  // Encrypt the secret using libsodium
  let encBytes = sodium.crypto_box_seal(binsec, binkey);

  // Convert the encrypted Uint8Array to Base64
  let output = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

  return output;
}

function extractBeforeAtSymbol(str) {
  const index = str.indexOf('@');
  if (index !== -1) {
      return str.substring(0, index);
  } else {
      return str;
  }
}




app.post("/", (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const hyperlink = "https://www.google.com/calendar/render?cid=webcal://raw.githubusercontent.com/novaeon/toddlescraper/main/" + extractBeforeAtSymbol(email) + ".ics";
    get_public_keys().then(data => {
      console.log(data['key']);
      // Secret names can only contain alphanumeric characters ([a-z], [A-Z], [0-9]) or underscores (_). Spaces are not allowed. Must start with a letter ([a-z], [A-Z]) or underscores (_).
      const encryptedpass = encryptSecret(data['key'], password)
      const encodedemail = Buffer.from(email).toString('hex')
      const encodedpassword = Buffer.from(password).toString('hex')
      insert_secret(encryptedpass, "ISP_" + encodedemail + "_" + encodedpassword, data['key_id']);
    })
    .catch(err => {
      console.log(err)
    })
    res.render('calendar.ejs', { link: hyperlink });
  });
    
app.listen(5001)