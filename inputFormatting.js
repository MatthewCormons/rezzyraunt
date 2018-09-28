var businessLogic = require('./businessLogic.js');

exports.submitReservation = function (requestBody, functionOnComplete)
{
    var inputObject =
    {
        timeOfReservation: requestBody.timeOfReservation,
        nameOfReservation: requestBody.nameOfReservation,
        numberOfGuests: requestBody.numberOfGuests,
        restaurant: requestBody.restaurant
    };

    businessLogic.submitReservation(inputObject, functionOnComplete);
}

exports.seatsAvailableForReservation = function (requestBody, functionOnComplete)
{
    var validReservationObject = 
    {
        timeOfReservation: requestBody.timeOfReservation,
        restaurant: requestBody.timeOfReservation
    };

    businessLogic.seatsAvailableForReservation(inputObject, functionOnComplete);
}

exports.cancelReservation = function(requestBody, functionOnComplete)
{
    var inputObject = 
    {
        timeOfReservation: requestBody.timeOfReservation,
        nameOfReservation: requestBody.nameOfReservation,
        restaurant: requestBody.restaurant
    };

    businessLogic.cancelReservation(inputLogic, functionOnComplete);
}

exports.rescheduleReservation = function(requestBody, functionOnComplete)
{
    var inputObject = 
    {
        timeOfReservation: requestBody.timeOfReservation,
        nameOfReservation: requestBody.nameOfReservation,
        newTimeOfReservation: requestBody.newTimeOfReservation,
        restaurant: requestBody.restaurant
    };

    businessLogic.rescheduleReservation(inputObject, functionOnComplete);
}

exports.registerGuest = function(requestBody, functionOnComplete)
{
    var inputLogic = 
    {
        timeOfReservation: requestBody.timeOfReservation,
        nameOfReservation: requestBody.nameOfReservation,
        restaurant: requestBody.restaurant
    };

    businessLogic.registerGuest(inputLogic, functionOnComplete);
}

exports.registerNoShow = function(requestBody, functionOnComplete)
{
    var inputLogic = 
    {
        timeOfReservation: requestBody.timeOfReservation,
        nameOfReservation: requestBody.nameOfReservation,
        restaurant: requestBody.restaurant
    };

    businessLogic.registerNoShow(inputLogic, functionOnComplete);
}