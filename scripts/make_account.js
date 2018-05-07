// create a completely new and unique pair of keys
// see more about KeyPair objects: https://stellar.github.io/js-stellar-sdk/Keypair.html
var StellarSdk = require('stellar-sdk');
StellarSdk.Network.useTestNetwork();

var pair = StellarSdk.Keypair.random();

// console.log(pair.secret());
// console.log(pair.publicKey());

var publicKey = 'GDNERPYVLFH36X63KXVPINXESYDZFF7GFJUHA3CQSO3LNXXCHLI25LXT';
var secretKey = 'SBSN726GGA34OUEWC5TAOT6POMCC7IEGDFPXZES6AUMSI4OPFKTP7WJY';

// The SDK does not have tools for creating test accounts, so you'll have to
// make your own HTTP request.
// var request = require('request');
// request.get({
//   url: 'https://friendbot.stellar.org',
//   qs: { addr: pair.publicKey() },
//   json: true
// }, function(error, response, body) {
//   if (error || response.statusCode !== 200) {
//     console.error('ERROR!', error || body);
//   }
//   else {
//     console.log('SUCCESS! You have a new account :)\n', body);
//   }
// });

var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
// var accountId = pair.publicKey();//'GBBORXCY3PQRRDLJ7G7DWHQBXPCJVFGJ4RGMJQVAX6ORAUH6RWSPP6FM';
function acctTransHistory() {
  server.transactions()
    .forAccount(publicKey)
    .call()
    .then(function (page) {
      console.log('Page 1: ');
      console.log(page.records);
      return page.next();
    })
    .then(function (page) {
      console.log('Page 2: ');
      console.log(page.records);
    })
    .catch(function (err) {
      console.log(err);
    });
}
function checkBalance(acctPubKey) {
  // the JS SDK uses promises for most actions, such as retrieving an account
  server.loadAccount(acctPubKey).then(function (account) {
    console.log('Balances for account: ' + acctPubKey);
    account.balances.forEach(function (balance) {
      console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
    });
  });
}

checkBalance(publicKey);

var destinationId = 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGSPIUKSLRB6Q723BM2OARMDUYEJ5';
// Transaction will hold a built transaction we can resubmit if the result is unknown.
var transaction;

var sourceKeyPair = StellarSdk.Keypair.fromSecret(secretKey);

function transferToAcct(destinationId) {
  // First, check to make sure that the destination account exists.
  server.loadAccount(destinationId)
    // If the account is not found, surface a nicer error message for logging.
    .catch(StellarSdk.NotFoundError, function (error) {
      throw new Error('The destination account does not exist!');
    })
    // If there was no error, load up-to-date information on your account.
    .then(function () {
      return server.loadAccount(sourceKeyPair.publicKey());
    })
    .then(function (sourceAccount) {
      // Start building the transaction.
      transaction = new StellarSdk.TransactionBuilder(sourceAccount)
        .addOperation(StellarSdk.Operation.payment({
          destination: destinationId,
          // Because Stellar allows transaction in many currencies, you must
          // specify the asset type. The special "native" asset represents Lumens.
          asset: StellarSdk.Asset.native(),
          amount: "10"
        }))
        // A memo allows you to add your own metadata to a transaction. It's
        // optional and does not affect how Stellar treats the transaction.
        .addMemo(StellarSdk.Memo.text('Test Transaction'))
        .build();
      // Sign the transaction to prove you are actually the person sending it.
      transaction.sign(sourceKeyPair);
      // And finally, send it off to Stellar!
      return server.submitTransaction(transaction);
    })
    .then(function (result) {
      console.log('Success! Results:', result);
    })
    .catch(function (error) {
      console.error('Something went wrong!', error);
      // If the result is unknown (no response body, timeout etc.) we simply resubmit
      // already built transaction:
      // server.submitTransaction(transaction);
    });

}














