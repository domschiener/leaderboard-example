var seed;
var numTxs = 0;
var addressList = [];

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
        seed = seed.slice(0, 81);
      }
  }

  //
  // Updates the address on the sidebar to the latest one
  //
  function updateAddressHTML() {
    // get the last added address in the list of addresses
    var address = addressList[addressList.length - 1];

    if (!address)
      return

    var html = '<div class="panel panel-primary"><div class="panel-heading">Address</div><div class="panel-body">' + address + '</div></div>'
    $("#allAddresses").html(html);
  }

  //
  //  Updates the leaderboard list HTML
  //
  function updateLeaderboardHTML(rankedList) {
    // Now we actually sort the rankedList
    rankedList.sort(function (a, b) {
      if (a.value > b.value) {
        return 1;
      }
      if (a.value < b.value) {
        return -1;
      }
      // a must be equal to b
      return 0;
    });

    var html = '';

    for (var i = 0; i < rankedList.length; i++) {

      var index = rankedList.length - 1 - i;
      var message = JSON.parse(rankedList[index].message);
      var value = rankedList[index].value
      var rank = i + 1;

      var listElement = '<tr><td class="iota__rank">#' + rank + '</td><td class="iota__name">' + message.name + '</td><td class="iota__message">' + message.message + '</td><td class="iota__value">' + value + '</td></tr>'
      html += listElement;
    }

    $("#leaderboard").html(html);
  }

  //
  // Gets the recent addresses of an account
  //  Stores it in a list which will be used to find transactions
  //
  function getAddresses() {

    // Command to be sent to the IOTA API
    // Gets the latest transfers for the specified seed
    var getTransfersCmd = {
      'command': 'getTransfers',
      'seed': seed,
      'securityLevel': 1
    }

    // We make a POST request via jQuery. The command is stringified
    $.post("http://localhost:14265", JSON.stringify(getTransfersCmd), function(data) {
      data.transfers.forEach(function(tx) {
        var txValue = parseInt(tx.value)

        // If the tx value is 0, then it was a new address generated
        // If it's above 0. then we received some new IOTA tokens
        if (txValue === 0) {
          var address = Curl.generateChecksum(tx.address);
          addressList.push(address);
        }
      })

      // Update the HTML for the address list
      updateAddressHTML();

      findTransactions();
    }, "json");
  }


  //
  //  Trytes to byte
  //  Reverse operation from the byteToTrytes function in send.js
  //  2 Trytes == 1 Byte
  //  We assume that the trytes are a JSON encoded object thus for our encoding:
  //    First character = {
  //    Last character = }
  //    Everything after that is 9's padding
  //
  function trytesToByte(inputTrytes) {
    var availValues = "9ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var outputString = "";

    for (var i = 0; i < inputTrytes.length; i += 2) {
      // get a trytes pair
      var trytes = inputTrytes[i] + inputTrytes[i + 1];

      var firstValue = availValues.indexOf(trytes[0]);
      var secondValue = availValues.indexOf(trytes[1]);

      var decimalValue = firstValue + secondValue * 27;

      var character = String.fromCharCode(decimalValue);

      outputString += character;

      //console.log("Converted trytes: %s, into char %s", trytes, character);
    }

    return outputString;
  }


  //
  //  Finds the latest transactions of a list of address
  //
  function findTransactions() {

    var findTransactionsCmd = {
      'command': 'findTransactions',
      'addresses': addressList
    }

    // We make a POST request via jQuery. The command is stringified
    $.post("http://localhost:14265", JSON.stringify(findTransactionsCmd), function(data) {

      if (numTxs >= data.hashes.length) {
        console.log("returning")
        return
      }

      var rankedList = []
      numTxs = data.hashes.length;
      var processedTxs = 0;

      data.hashes.forEach(function(hash) {

        console.log("hash", hash)
        var findTransactionsCmd = {
          'command': 'getBundle',
          'transaction': hash
        }

        // We make a POST request via jQuery. The command is stringified
        $.post("http://localhost:14265", JSON.stringify(findTransactionsCmd), function(data) {
          console.log(data);

          // If the bundle only contains 1 transaction, it does not contain a message
          if (data.transactions.length < 2) {
            processedTxs += 1;
            return
          }

          // Sanity check: if the first tryte pair is not opening bracket, it's not a message
          var firstTrytePair = data.transactions[0].signatureMessageChunk[0] + data.transactions[0].signatureMessageChunk[1];
          if (firstTrytePair !== "OD") {
            console.log("Not a message!");
            processedTxs += 1;
            return
          }


          var index = 0;
          var notEnded = true;
          var tryteChunk = '';
          var trytesChecked = 0;
          var preliminaryStop = false;

          do {

            var messageChunk = data.transactions[index].signatureMessageChunk;

            // We iterate over the message chunk, readying 9 trytes at a time
            for (var i = 0; i < messageChunk.length; i += 9) {
              var trytes = messageChunk.slice(i, i + 9);
              tryteChunk += trytes;

              var upperLimit = tryteChunk.length - tryteChunk.length % 2;

              // Get the trytes to check if we have reached the end of our data
              // The end of the data stream is determined by a closing bracket char
              var trytesToCheck = tryteChunk.slice(trytesChecked, upperLimit);

              // We read 2 trytes at a time and check if it equals the closing bracket char
              for (var j = 0; j < trytesToCheck.length; j += 2) {

                var trytePair = trytesToCheck[j] + trytesToCheck[j + 1];

                // If closing bracket char was found, and there are only trailing 9's
                // we quit and remove the 9's from the tryteChunk.
                if (preliminaryStop && trytePair === "99") {
                  notEnded = false;

                  // Remove the trailing 9's from tryte data chunk .
                  tryteChunk = tryteChunk.slice(0, tryteChunk.length - (trytesToCheck.length - (j + 1)))
                  break;
                }

                // If tryte pair equals closing bracket char, we set a preliminary stop
                if (trytePair === "QD") {
                  preliminaryStop = true;
                }
              }

              if (!notEnded)
                break;

              trytesChecked = trytesToCheck.length;
            }

            index += 1;

          } while (notEnded);

          var value = parseInt(data.transactions[0].value);

          // Convert the trytes into bytes
          var message = trytesToByte(tryteChunk);

          var newTx = {
            'value': Math.floor(Math.random() * (value + 100 * Math.random())),
            'message': message,
            'hash': hash
          }

          rankedList.push(newTx);
          processedTxs += 1;

          if (processedTxs === numTxs) {
            console.log(rankedList.length, numTxs)
            updateLeaderboardHTML(rankedList);
          }
        }, "json");
      })
    }, "json");
  }

  //
  // Generate address function
  //
  function genAddress() {

    $.when(

      // Get an address
      getNewAddress(seed),
      // As well as the latest milestone index
      getNodeInfo()

    ).done(function(newAddress, nodeInfo) {

      var address = newAddress[0].address;
      var milestoneIndex = nodeInfo[0].milestoneIndex;

      $.when(

        // Get the latest milestone
        getMilestone(milestoneIndex)

      ).done(function(newMilestone) {

        if (newMilestone.exception) return console.log(newMilestone.exception);
        console.log("Generating your address from your private key. Getting tips and preparing the transfer now (this can take a few minutes).");

        var milestone = newMilestone.milestone;

        $.when(

          // Tip selection
          getTxToApprove(milestone),
          // Prepare the trytes (transaction data) for our transaction
          prepareTransfers(address, '0', '')

        ).done(function(txsToApprove, preparedTrytes) {

          // Tangle not solid check
          if (txsToApprove.error) return console.log(txsToApprove.error);
          console.log("Successfully generated the trytes for your address transaction. Doing the PoW now (this can take a few minutes).");

          var branchTx = txsToApprove[0].branchTransaction;
          var trunkTx = txsToApprove[0].trunkTransaction;
          var transferTrytes = preparedTrytes[0].trytes;


          // Attach the transaction to the Tangle
          // Wait for callback and then broadcast and store it
          // This API call can take several minutes
          console.log(branchTx, trunkTx);
          console.log(transferTrytes);
          attachToTangle(branchTx, trunkTx, transferTrytes).done(function(data) {

            if (data.exception) return console.log(data.exception);
            console.log("Successfully attached your address to the tangle. Broadcasting it now.");
            console.log(data.trytes);
            // Broadcast the transaction to all neighbors
            broadcastTransactions(data.trytes).done(function(success) {

              if (success.exception) return console.log(success.exception);
              console.log("Successfully broadcast your transasction. Storing it now.");

              // Store the transaction in the local tangle
              storeTransactions(data.trytes).done(function(finished) {

                if (finished.exception) return console.log(finished.exception);

                console.log("Successfully generated, attached to the Tangle, broadcast and stored your address " + address);

                // We remove the CSS overlay
                $("#overlay").css("display", "none");

                // We add the new address to the address set
                addressList.push(address);

                // Update the HTML on the site
                updateAddressHTML()
              })
            })
          })
        })
      })
    })
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
    getAddresses();
    setInterval(findTransactions, 30000);
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
});
