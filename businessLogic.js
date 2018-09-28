var reservationPaymentHandling = require('./reservationPaymentHandling.js');
var dbLogic = require('./dbLogic.js')

exports.submitReservation = function(inputObject, functionOnComplete)
{
    var seatsAvailableInputObject =
    {
        timeOfReservation: inputObject.timeOfReservation,
        nameOfReservation: inputObject.nameOfReservation
    };
    
    seatsAvailableForReservation(seatsAvailableInputObject, function(error, seatsAvailable)
    {
        if (error)
        {
            functionOnComplete(error);
        }
        else
        {
            if (seatsAvailable >= inputObject.numberOfGuests)
            {
                var inputObjectPayment = 
                {
                    amount: 10.00
                };

                reservationPaymentHandling.makePayment(inputObjectPayment, function(error)
                {
                    if (error)
                    {
                        functionOnComplete(error);
                    }
                    else
                    {
                        dbLogic.insertReservation(inputObject, function(error)
                        {
                            functionOnComplete(error);
                        });
                    }
                });
            }
            else
            {
                var errorObject = 
                {
                    errorMessage: "Not enough space for guests in reservation."
                };
                functionOnComplete(errorObject);
            }
        }
    });
}

exports.cancelReservation = function(inputObject, functionOnComplete)
{
    dbLogic.findReservation(inputObject, function(error, foundReservation) 
    {
        if (error)
        {
            functionOnComplete(error);
        }
        else
        {
            if (foundReservation)
            {
                var refundCalculationObject = 
                {
                    timeOfReservation: inputObject.timeOfReservation
                };
                
                var refund = calculateRefund(refundCalculationObject);
                reservationPaymentHandling.makeRefund(refund, function(error)
                {
                    if (error)
                    {
                        functionOnComplete(error);
                    }
                    else
                    {
                        dbLogic.deleteReservation(inputObject, function(error)
                        {
                            functionOnComplete(error);
                        });
                    }
                });
            }
            else
            {
                var errorObject = 
                {
                    errorMessage: "No reservation for this person at that time found."
                };
                functionOnComplete(errorObject);
            }
        }
    });
}

exports.rescheduleReservation = function(inputObject, functionOnComplete)
{
    var findInputObject = 
    {
        timeOfReservation: inputObject.timeOfReservation,
        nameOfReservation: inputObject.nameOfReservation,
    };

    dbLogic.findReservation(findInputObject, function(error, foundReservation)
    {
        if (error)
        {
            functionOnComplete(error);
        }
        else
        {
            if (foundReservation)
            {
                var deleteInputObject =
                {
                    timeOfReservation: inputObject.timeOfReservation,
                    nameOfReservation: inputObject.nameOfReservation,
                };
                dbLogic.deleteReservation(deleteInputObject, function(error)
                {
                    if (error)
                    {
                        functionOnComplete(error);
                    }
                    else
                    {
                        var insertInputObject = 
                        {
                            timeOfReservation: inputObject.newTimeOfReservation,
                            nameOfReservation: inputObject.nameOfReservation,
                            numberOfGuests: foundReservation.numberOfGuests
                        };
                        
                        var seatsAvailableInputObject =
                        {
                            timeOfReservation: inputObject.timeOfReservation,
                            nameOfReservation: inputObject.nameOfReservation
                        };

                        seatsAvailableForReservation(seatsAvailableInputObject, function(error, result)
                        {
                            if (error)
                            {
                                functionOnComplete(error);
                            }
                            else
                            {
                                dbLogic.insertReservation(insertInputObject, function(error)
                                {
                                    functionOnComplete(error);
                                });
                            }
                        });
                    }
                });
            }
            else
            {
                var errorObject = 
                {
                    errorMessage: "No reservation for this person at that time found."
                };
                functionOnComplete(errorObject);
            }
        }
    });
}

exports.seatsAvailableForReservation = function(inputObject, functionOnComplete)
{
    var validReservationObject = 
    {
        timeOfReservation: inputObject.timeOfReservation,
        restaurant: inputObject.timeOfReservation
    };
    dbLogic.validTimeForReservation(validReservationObject, function(error, result)
    {
        if (error)
        {
            functionOnComplete(error, null);
        }
        else
        {
            dbLogic.seatsAvailableForReservation(inputObject, function(error, result)
            {
                functionOnComplete(error, result);
            });
        }
    });
}

exports.validTimeForReservation = function(inputObject, functionOnComplete)
{
    dbLogic.validTimeForReservation(inputObject, function(error)
    {
        functionOnComplete(error);
    });
}

exports.registerGuestArrival = function(inputObject, functionOnComplete)
{
    var refundCalculationObject = 
    {
        timeOfReservation: inputObject.timeOfReservation
    };
    
    var refund = calclateRefund(refundCalculationObject);
    reservationPaymentHandling.makeRefund(refund, function(error)
    {
        if (error)
        {
            functionOnComplete(error);
        }
        else
        {
            var deleteInputObject =
            {
                timeOfReservation: inputObject.timeOfReservation,
                nameOfReservation: inputObject.nameOfReservation,
            };
            dbLogic.deleteReservation(deleteInputObject, function(error)
            {
                functionOnComplete(error);
            });
        }
    });
}

exports.registerNoShow = function(inputObject, functionOnComplete)
{
    dbLogic.deleteReservation(inputObject, function(error) 
    {
        functionOnComplete(error);
    });
}

exports.calculateRefund = function(inputObject)
{
    var returnObject;
    var refundPercent;
    
    // Create current date.
    //
    var currentDate = Date();
    var currentDateInMilliseconds = currentDate.getMilliseconds();

    var differenceBetweenCurrentTimeAndReservation = 
        inputObject.timeOfReservation.getMilliseconds() - currentDateInMilliseconds;

    // Date Stored in Milliseconds
    //
    var twentyFourHoursInMilliseconds = 86400000.0;
    var twelveHoursInMilliseconds = 43200000.0;
    var twoHoursInMilliseconds = 7200000;
    var oneMinutesInMilliseconds = 60000.0;

    var numberOfMillisecondsInADay = 86400000.0;

    if (differenceBetweenCurrentTimeAndReservation < twentyFourHoursInMilliseconds &&
        differenceBetweenCurrentTimeAndReservation >= twelveHoursInMilliseconds)
    {
        refundPercent: 0.75;
    }
    else if (differenceBetweenCurrentTimeAndReservation < twelveHoursInMilliseconds &&
        differenceBetweenCurrentTimeAndReservation >= twoHoursInMilliseconds)
    {
        refundPercent: 0.5;
    }
    else if (differenceBetweenCurrentTimeAndReservation < twoHoursInMilliseconds &&
        differenceBetweenCurrentTimeAndReservation >= oneMinutesInMilliseconds)
    {
        refundPercent: 0.25;
    }
    else
    {
        refundPercent: 0.0;
    }

    returnObject = 
    {
        refundAmount: refundPercent * 10.00
    }

    return returnObject;
}