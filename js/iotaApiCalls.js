/**
  *   IOTA API Call to generate a new address from a private key (provided by the seed)
  *   Makes an Ajax request and returns the Deferred object
**/
var getNewAddress = function(seed) {

  var command = {
    'command': 'getNewAddress',
    'securityLevel': 1,
    'seed': seed
  }

  var options = {
    type: "POST",
    url: "http://localhost:14265",
    data: JSON.stringify(command)
  };

  return $.ajax(options);
}

/**
  *   Get the latest information of your node, as well as the network. For us the `milestoneIndex` is of
  *   importance. It will later be used to fetch the tips to confirm.
**/
var getNodeInfo = function() {

  var command = {
    'command': 'getNodeInfo'
  }

  var options = {
    type: "POST",
    url: "http://localhost:14265",
    data: JSON.stringify(command)
  };

  return $.ajax(options);
}

/**
  *   Gets the latest coordinator milestone.
  *   @param {string} milestoneIndex (Provided by getNodeInfo API call)
**/
var getMilestone = function(milestoneIndex) {

  var command = {
    'command': 'getMilestone',
    'index': milestoneIndex
  }

  var options = {
    type: "POST",
    url: "http://localhost:14265",
    data: JSON.stringify(command)
  };

  return $.ajax(options);
}

/**
  *   Gets the branch and trunk transaction (tips) which need to be approved by our transaction.
  *   @param {string} milestone (Provided by getMilestone API call).
**/
var getTxToApprove = function(milestone) {

  var command = {
    'command': 'getTransactionsToApprove',
    'milestone': milestone
  }

  var options = {
    type: "POST",
    url: "http://localhost:14265",
    data: JSON.stringify(command)
  };

  return $.ajax(options);
}

/**
  *   Prepare the trytes (raw transaction data) for an empty message which will
  *   be sent to our address in order to attach it to the Tangle
  *   @param {string} address (provided by getNewAddress API call).
**/
var prepareTransfers = function(address, value, message) {

  var command = {
    'command': 'prepareTransfers',
    'seed': '999999999999999999999999999999999999999999999999999999999999999999999999999999999',
    'securityLevel': 1,
    'transfers': [{
      'value': value,
      'message': message,
      'address': address
    }]
  }

  var options = {
    type: "POST",
    url: "http://localhost:14265",
    data: JSON.stringify(command)
  };

  return $.ajax(options);
}

/**
  *   Attaches the empty message transaction to the Tangle by doing the Proof of Work
  *   and validating the branch and trunk transactions, as well as the subtangle.
  *   @param {string} branchTx (provided by getTransactionsToApprove API Call)
  *   @param {string} trunkTx (provided by getTransactionsToApprove API Call)
  *   @param {array} trytes (provided by prepareTransfers API Call)
**/
var attachToTangle = function(branchTx, trunkTx, trytes) {

  var command = {
    'command': 'attachToTangle',
    'seed': '999999999999999999999999999999999999999999999999999999999999999999999999999999999',
    'branchTransaction': branchTx,
    'trunkTransaction': trunkTx,
    'minWeightMagnitude': 13,
    'trytes': trytes
  }

  var options = {
    type: "POST",
    url: "http://localhost:14265",
    data: JSON.stringify(command)
  };

  return $.ajax(options);
}

/**
  *   Broadcast the successfully generated and attached transaction to all neighbors
  *   @param {array} trytes (provided by attachToTangle API Call)
**/
var broadcastTransactions = function(trytes) {
  var command = {
    'command': 'pushTransactions',
    'trytes': trytes
  }

  var options = {
    type: "POST",
    url: "http://localhost:14265",
    data: JSON.stringify(command)
  };

  return $.ajax(options);
}

/**
  *   Stores the successfully generated and attached transaction locally
  *   @param {array} trytes (provided by attachToTangle API Call)
**/
var storeTransactions = function(trytes) {
  var command = {
    'command': 'storeTransactions',
    'trytes': trytes
  }

  var options = {
    type: "POST",
    url: "http://localhost:14265",
    data: JSON.stringify(command)
  };

  return $.ajax(options);
}
