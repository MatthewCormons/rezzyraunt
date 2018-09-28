// Nothing is done in this class.  This is where external payment handling is done.
//
exports.makePayment = function(inputObjectPayment, functionOnComplete)
{
    var errorObject = null;
    functionOnComplete(errorObject);
}

exports.makeRefund = function(inputObjectPayment, functionOnComplete)
{
    var errorObject = null;
    functionOnComplete(errorObject);
}