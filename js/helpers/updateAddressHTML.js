//
// Updates the address on the sidebar to the latest one
//
function updateAddressHTML(address) {

    if (!address)
        return

    var html = '<div class="panel panel-primary"><div class="panel-heading">Address</div><div class="panel-body">' + address + '</div></div>'

    $("#allAddresses").html(html);
}
