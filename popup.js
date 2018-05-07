StellarSdk.Network.useTestNetwork();
var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');

$(document).ready(function () {
    $("#createAcctBtn").click(function () {
        createNewAccount();
    });
    $("#logInBtn").click(function () {
        loginAttempt();
    });
    $("#refreshBalanceBtn").click(function () {
        checkBalance();
    });
    $("#confirmSend").click(function () {
        performTransaction();
    });

});

var publicKey;
var password;
function loginAttempt() {
    password = $("#password").val();

    chrome.storage.sync.get("default", function (result) {
        console.log(result);
        if (result.default) {

            console.log("Public key found: " + result.default.publicKey)
            if (result.default.password == password) {
                publicKey = result.default.publicKey;
                console.log("password correct, logging in");
                login();
            } else {
                $("#loginResponse").show();
                $("#loginResponse").text("Wrong Password, Please Try Again");
                // alert("Password incorrect, please try again.");
            }
        } else {
            $("#loginResponse").show();
            $("#loginResponse").text("No account found, please create account first");
        }
    });
}

function createNewAccount() {

    var pair = StellarSdk.Keypair.random();
    publicKey = pair.publicKey();
    var secretKey = pair.secret();

    password = $("#password").val();
    var encryptedSecretKey = CryptoJS.AES.encrypt(secretKey, password);

    console.log("encrypted secret: " + encryptedSecretKey);

    console.log("public key: " + publicKey);
    console.log("secret Key: " + secretKey);
    console.log("password: " + password);

    chrome.storage.sync.set({ "encryptedSecretKey": String(encryptedSecretKey) }, function () {

    });

    chrome.storage.sync.set(
        {
            "default": {
                "publicKey": publicKey,
                "password": password
            }
        }, function () {
            if (chrome.runtime.error) {
                console.log("Runtime error.");
            } else {
                console.log("Storaged saved for " + publicKey + ", " + password);
            }
        });

    var xhr = new XMLHttpRequest();
    var url = "https://friendbot.stellar.org?addr=" + publicKey;
    xhr.open('GET', url, true);
    xhr.send();
    xhr.onreadystatechange = processRequest;
    $("#loginResponse").show();
    $("#loginResponse").text("Contacting server. Please wait...");
    function processRequest(e) {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                var response = JSON.parse(xhr.responseText);
                // alert("new account created!");
                
                login();
            } else {
                // alert("New account creation failed");
                $("#loginResponse").show();
                $("#loginResponse").text("New account creation failed, testnet may be busy. Please try again later");
            }
        }
    }


}
function loadStorage(name) {
    chrome.storage.sync.get(name, function (result) {
        if (chrome.runtime.error) {
            console.log("Runtime error.");
        } else {
            return result;
        }
    });
}

function setStorage(name, value) {
    // console.log(typeof(name));
    // console.log(typeof(value));
    var obj = {};
    obj[name] = String(value);
    chrome.storage.sync.set(obj, function () {
        if (chrome.runtime.error) {
            console.log("Runtime error.");
        } else {
            console.log("Storaged saved for " + name + ":" + value);
        }
    });
}

function login() {
    $("div.top").hide();
    $("div.secondPage").show();
    console.log("succesfully logged in");

    $("#publicKey").text(publicKey);
    checkBalance(publicKey);

}

function checkBalance() {
    // the JS SDK uses promises for most actions, such as retrieving an account
    if (publicKey) {
        acctPubKey = publicKey;
        server.loadAccount(acctPubKey).then(function (account) {
            console.log('Balances for account: ' + acctPubKey);
            console.log(account.balances[0]);
            $("#balance").text(account.balances[0].balance);
        });
    } else {
        console.log("public key undefined.")
    }
}


function performTransaction() {
    $("#sendResponse").hide();
    var encryptedSecretKey, secretKey, secretKeyObj;
    var amount = $("#sendAmount").val();
    // var secretKey = loadStorage("encryptedSecretKey")
    chrome.storage.sync.get("encryptedSecretKey", function (result) {
        console.log(result);
        encryptedSecretKey = String(result.encryptedSecretKey);
        console.log("ecnrypted: ", encryptedSecretKey, "password: ", password);
        bytes = CryptoJS.AES.decrypt(encryptedSecretKey, String(password));
        var secretKey = bytes.toString(CryptoJS.enc.Utf8);
        console.log("Decrypted: " + secretKey);
        var sourceKeyPair = StellarSdk.Keypair.fromSecret(secretKey);
        var destinationId = $("#destAcct").val();
        console.log("desk account: " + destinationId);
        transferToAcct(destinationId, sourceKeyPair, amount);
    });

}
function transferToAcct(destinationId, sourceKeyPair, amount) {
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
                    amount: String(amount)
                }))
                // A memo allows you to add your own metadata to a transaction. It's
                // optional and does not affect how Stellar treats the transaction.
                .addMemo(StellarSdk.Memo.text('Test Transaction'))
                .build();
            // Sign the transaction to prove you are actually the person sending it.
            transaction.sign(sourceKeyPair);
            // And finally, send it off to Stellar!
            $("#sendResponse").show();
            $("#sendResponse").text('Submitting Transaction...');
            return server.submitTransaction(transaction);
        })
        .then(function (result) {
            console.log('Success! Results:', result);
            $("#sendResponse").show();
            $("#sendResponse").text('Transaction Success!');// Results: ' + result.toString());
            checkBalance();
        })
        .catch(function (error) {
            console.error('Something went wrong!', error);
            $("#sendResponse").show();
            $("#sendResponse").text('Something went wrong! ' + String(error));
            
            // If the result is unknown (no response body, timeout etc.) we simply resubmit
            // already built transaction:
            // server.submitTransaction(transaction);
        });
}