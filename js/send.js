var seed;
var numTxs = 0;
var addressList = [];
var balance = 0;

$(document).ready(function() {

  function toggleSidebar() {
    $(".button").toggleClass("active");
    $("main").toggleClass("move-to-left");
    $(".sidebar-item").toggleClass("active");
    $(".sidebar").toggleClass("donotdisplay");
  }

  //
  // Properly formats the seed, replacing all non-latin chars with 9's
  // And extending it to length 81
  //
  function setSeed(value) {
      var i;
      seed = "";
      value = value.toUpperCase();
      for (i = 0; i < value.length; i++) {
          if (("9ABCDEFGHIJKLMNOPQRSTUVWXYZ").indexOf(value.charAt(i)) < 0) {
              seed += "9";
          } else {
              seed += value.charAt(i);
          }
      }
      while (seed.length < 81) {
          seed += "9";
      }

      if (seed.length > 81) {
        seed = seed.slice(0, 82);
      }
  }

  //
  // Updates the address on the sidebar to the latest one
  //
  function updateAddressHTML() {
    // get the last added address in the list of addresses
    var address = addressList[addressList.length - 1];
    var html = '<div class="panel panel-primary"><div class="panel-heading">Address</div><div class="panel-body">' + address + '</div></div>'
    $("#allAddresses").html(html);
  }

  //
  // Updates the balance shown on the page
  //
  function updateBalanceHTML() {
    $("#iota__balance").html(balance);
  }

  //
  // Gets the addresses and transactions of an account
  // As well as the current balance
  //  Automatically updates the HTML on the site
  //
  function getAccountInfo() {

    // Command to be sent to the IOTA API
    // Gets the latest transfers for the specified seed
    var getTransfersCmd = {
      'command': 'getTransfers',
      'seed': seed,
      'securityLevel': 1
    }

    // We make a POST request via jQuery. The command is stringified
    $.post("http://localhost:14265", JSON.stringify(getTransfersCmd), function(data) {

      // If a new transaction was received, process it
      if (numTxs < data.transfers.length) {

        numTxs = data.transfers.length;
        balance = 0;

        // Then we create a ranked list to sort all incoming transactions
        var rankedList = [];

        data.transfers.forEach(function(tx) {
          var txValue = parseInt(tx.value)

          // If the tx value is 0, then it was a new address generated
          // If it's above 0. then we received some new IOTA tokens
          if (txValue === 0) {

            addressList.push(tx.address);
          } else {

            if (tx.persistence > 0) {
              balance += txValue;
            }
          }
        })

        // Update the HTML for the address list
        updateAddressHTML();

        // Update total balance
        updateBalanceHTML();
      }
    }, "json");
  }

  //
  //  Generate address function
  //  Automatically updates the HTML on the site
  //
  function genAddress() {
    // Command to be sent to the IOTA API
    // Generates a new address for the specified seed and security level
    var genAddressCmd = {
      'command': 'generateNewAddress',
      'seed': seed,
      'securityLevel': 1,
      'minWeightMagnitude': 13
    }

    // We make a POST request via jQuery. The command is stringified
    $.post("http://localhost:14265", JSON.stringify(genAddressCmd), function(data) {
      // We remove the "Generating Address" notice again
      $("#overlay").css("display", "none");

      // We add the new address to the address set
      addressList.push(data.address);

      // Update the HTML on the site
      updateAddressHTML()
    }, "json")
  }


  //
  //  Conversion of bytes to trytes.
  //  Input is a string (can be stringified JSON object), return value is Trytes
  //
  //  How the conversion works:
  //    2 Trytes === 1 Byte
  //    There are a total of 27 different tryte values: 9ABCDEFGHIJKLMNOPQRSTUVWXYZ
  //
  //    1. We get the decimal value of an individual ASCII character
  //    2. From the decimal value, we then derive the two tryte values by basically calculating the tryte equivalent (e.g. 100 === 19 + 3 * 27)
  //      a. The first tryte value is the decimal value modulo 27 (27 trytes)
  //      b. The second value is the remainder (decimal value - first value), divided by 27
  //    3. The two values returned from Step 2. are then input as indices into the available values list ('9ABCDEFGHIJKLMNOPQRSTUVWXYZ') to get the correct tryte value
  //
  //   EXAMPLES
  //      Lets say we want to convert the ASCII character "Z".
  //        1. 'Z' has a decimal value of 90.
  //        2. 90 can be represented as 9 + 3 * 27. To make it simpler:
  //           a. First value: 90 modulo 27 is 9. This is now our first value
  //           b. Second value: (90 - 9) / 27 is 3. This is our second value.
  //        3. Our two values are now 9 and 3. To get the tryte value now we simply insert it as indices into '9ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  //           a. The first tryte value is '9ABCDEFGHIJKLMNOPQRSTUVWXYZ'[9] === "I"
  //           b. The second tryte value is '9ABCDEFGHIJKLMNOPQRSTUVWXYZ'[3] === "C"
  //        Our tryte pair is "IC"
  //
  //      RESULT:
  //        The ASCII char "Z" is represented as "IC" in trytes.
  //
  function byteToTrytes(inputString) {
    var availValues = "9ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var trytes = "";

    for (var i = 0; i < inputString.length; i++) {
      var char = inputString[i];
      var asciiValue = char.charCodeAt(0);

      // If not recognizable ASCII character, replace with space
      if (asciiValue > 255) {
        asciiValue = 32
      }

      var firstValue = asciiValue % 27;
      var secondValue = (asciiValue - firstValue) / 27;

      var trytesValue = availValues[firstValue] + availValues[secondValue];

      trytes += trytesValue;

      //console.log("Converted char: %s, into trytes %s", char, trytesValue);
    }
    console.log("Final Tryte Value:", trytes);
    return trytes;
  }


  //
  //  Makes a new transfer for the specified seed
  //  Includes message and value
  //
  function sendTransfer(address, value, message) {
    var transferCmd = {
      'command': 'transfer',
      'seed': seed,
      'address': address,
      'value': value.toString(),
      'message': message,
      'securityLevel': 1,
      'minWeightMagnitude': 13
    }

    // We make a POST request via jQuery. The command is stringified
    $.post("http://localhost:14265", JSON.stringify(transferCmd), function(data) {
      // We then display the return data on the HTML
      if (data.tail) {
        var html = '<div class="alert alert-info alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><strong>Success!</strong> You have successfully sent your transaction. If you want to make another one make sure that this transaction is confirmed first (check in your client).</div>'
        $("#send__success").html(html);

        $("#submit").toggleClass("disabled");

        $("#send__waiting").css("display", "none");

        balance = balance - value;
        updateBalanceHTML();
      } else {
        var html = '<div class="alert alert-danger alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><strong>ERROR!</strong>' + JSON.stringify(data) + '.</div>'
        $("#send__success").html(JSON.stringify());

        $("#submit").toggleClass("disabled");

        $("#send__waiting").css("display", "none");
        console.log(data)
      }

    }, "json")
  }

  //
  // Menu Open/Close
  //
  $(".button").on("click tap", function() {
    toggleSidebar();
  });

  //
  // Set seed
  //
  $("#seedSubmit").on("click", function() {

    // We modify the entered seed to fit the criteria of 81 chars, all uppercase and only latin letters
    setSeed($("#userSeed").val());

    // Then we remove the input
    $("#enterSeed").html('<div class="alert alert-success" role="alert">Successfully saved your seed. You can generate an address now.</div>');

    // We fetch the latest transactions every 30 seconds
    getAccountInfo();
    setInterval(getAccountInfo, 30000);
  });

  //
  // Generate a new address
  //
  $("#genAddress").on("click", function() {
    if (!seed)
      return

    $("#overlay").css("display", "block");
    genAddress();
  })

  //
  // Send a new message
  //
  $("#submit").on("click", function() {

    if (!seed) {
      var html = '<div class="alert alert-warning alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><strong>No Seed!</strong> You have not entered your seed yet. Do so on the Menu on the right.</div>'
      $("#send__success").html(html);
      return
    }

    if (!balance) {
      var html = '<div class="alert alert-warning alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><strong>No Tokens!</strong> You do not have enough IOTA tokens. Make sure you have enough confirmed tokens.</div>'
      $("#send__success").html(html);
      return
    }

    var name = $("#name").val();
    var value = parseInt($("#value").val());
    var address = $("#address").val();
    var message = $("#message").val();

    if (!name || !value || !message)
      return

    if (value > balance) {
      var html = '<div class="alert alert-warning alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><strong>Value too high!</strong> You have specified a too high value.</div>'
      $("#send__success").html(html);
      return
    }

    var messageToSend = {
      'name': name,
      'message': message
    }

    var trytes = byteToTrytes(JSON.stringify(messageToSend));

    // We display the loading screen
    $("#send__waiting").css("display", "block");
    $("#submit").toggleClass("disabled");
    // If there was any previous error message, we remove it
    $("#send__success").html();


    sendTransfer(address, value, trytes);
  })
});
