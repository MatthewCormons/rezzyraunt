var MongoClient = require('mongodb').MongoClient;

var dbConnect = function(functionOnComplete)
{
    var dbUrl = "mongodb://localhost:27017/dataDb";
    
    MongoClient.connect(dbUrl, function(error, db)
    {
        // The caller is responsible for closing the db connection.
        //
        functionOnComplete(error, db);
    });
}

exports.insertReservation = function(inputObject, functionOnComplete)
{
    dbConnect(function(error, db)
    {
        if (error)
        {
            db.close();
            functionOnComplete(error);
        }
        else
        {
            var insertObject = 
            {
                timeOfReservation: inputObject.timeOfReservation,
                nameOfReservation: inputObject.nameOfReservation,
                numberOfGuests: inputObject.numberOfGuests,
                status: "new"
            };

            db.collection(inputObject.restaurant).insertOne(insertObject, function(error, result)
            {
                db.close();
                functionOnComplete(error);
            });
        }
    });
}

exports.findReservation = function(inputObject, functionOnComplete)
{
    findReservationHelper(inputObject, function(error, result)
    {
        db.close();
        functionOnComplete(error, result);
    });
}

var findReservationHelper = function(inputObject, functionOnComplete)
{
    // This function relies on the caller to close the db connection.
    //
    dbConnect(function(error, db)
    {
        if (error)
        {
            functionOnComplete(error, null);
        }
        else
        {
            var findObject = 
            {
                timeOfReservation: inputObject.timeOfReservation,
                nameOfReservation: inputObject.nameOfReservation,
                status: "new"
            };

            db.collection(inputObject.restaurant).findOne(findObject, function(error, result)
            {
                functionOnComplete(error, result);
            });
        }
    });
}

exports.deleteReservation = function(inputObject, functionOnComplete)
{
    findReservationHelper(inputObject, function(error, result)
    {
        // Move the reservation to the old part of the collection.
        //
        var insertObject = 
        {
            timeOfReservation: inputObject.timeOfReservation,
            nameOfReservation: inputObject.nameOfReservation,
            numberOfGuests: result.numberOfGuests,
            status: "old"
        };

        db.collection(inputObject.restaurant).insertOne(insertObject, function(error, result)
        {
            // Delete the original reservation.
            //
            var deleteObject = 
            {
                timeOfReservation: inputObject.timeOfReservation,
                nameOfReservation: inputObject.nameOfReservation,
            };
            db.collection(inputObject.restaurant).deleteOne(deleteObject, function(error, result)
            {
                functionOnComplete(error);
            });
        });
    });
}

exports.seatsAvailableForReservation = function(inputObject, functionOnComplete)
{
    dbConnect(function(error, db)
    {
        if (error)
        {
            db.close();
            functionOnComplete(error, null);
        }
        else
        {
            var hourAndHalfInMilliseconds = 5400000.0;
            var upperRange = inputObject.timeOfReservation + hourAndHalfInMilliseconds;
            var lowerRange = inputObject.timeOfReservation - hourAndHalfInMilliseconds;
            var countQuery = 
            {
                timeOfReservation: 
                {
                    $gt: lowerRange,
                    $lt: upperRange
                }
            };
            db.collection(inputObject.restaurant).count(countQuery, function(error, count)
            {
                if (error)
                {
                    db.close();
                    functionOnComplete(error, null);
                }
                else
                {
                    var findMaxOccupancyObject = 
                    {
                        maxOccupancy: 
                        {
                            $gt: 0
                        }
                    };
                    db.collection(inputObject.restaurant).findOne(findMaxOccupancyObject, function(error, result)
                    {
                        db.close();
                        var numberOfSeatsObject = 
                        {
                            seatsAvailableForReservation: count - result.maxOccupancy
                        };
                        functionOnComplete(null, numberOfSeatsObject);
                    });
                }
            });
        }
    });
}

exports.validTimeForReservation = function(inputObject, functionOnComplete)
{    
    var potentialReservationDateObject = new Date(inputObject.timeOfReservation);
    var dayOfWeekOfPotentialReservation = potentialReservationDateObject.getDay();
    var hoursRetrievalObject = 
    {
        hoursOfOperation: dayOfWeekOfPotentialReservation
    };
    dbConnect(function(error, db)
    {
        if (error)
        {
            db.close();
            functionOnComplete(error, null);
        }
        else
        {
            db.collection(inputObject.restaurant).findOne(hoursRetrievalObject, function(error, result)
            {
                db.close();
                if (error)
                {
                    functionOnComplete(error, null);
                }
                else
                {
                    var hoursOfPotentialReservation = potentialReservationDateObject.getHours();
                    var minutesOfPotentialReservationInHours = potentialReservationDateObject.getMinutes()/60.0;
                    var totalHoursOfPotentialReservation = hoursOfPotentialReservation + minutesOfPotentialReservationInHours;

                    var totalHoursAsMilliseconds = 3600000.0 * totalHoursOfPotentialReservation;

                    var isValidTimeForReservation = totalHoursAsMilliseconds >= result.openTime && totalHoursAsMilliseconds < result.closeTime;
                    
                    var resultObject = 
                    {
                        validTimeForReservation: isValidTimeForReservation
                    };

                    functionOnComplete(null, resultObject);
                }
            });
        }
    });
}

/////////////////////////////////////////////////////
// Admin only setup tasks.
/////////////////////////////////////////////////////
exports.createRestaurant = function(inputObject)
{
    dbConnect(function (error, db)
    {
        if (error)
        {
            console.log("Restaurant creation failed.");
        }
        else
        {
            db.createCollection(inputObject.restaurant, function(error, result) 
            {
                if (error)
                {
                    db.close();
                    console.log("Restaurant creation failed.");
                }
                else
                {
                    // Add max occupancy.
                    //
                    var maxOccupancyObject =
                    {
                        maxOccupancy: inputObject.maxOccupancy
                    };
                    db.collection(inputObject.restaurant).insertOne(maxOccupancyObject, function(error, result)
                    {
                        if (error)
                        {
                            db.close();
                            console.log("Restaurant creation failed.");
                        }
                        else
                        {
                            var insertObject = 
                            {
                                hoursOfOperation: 0,
                                openTime: inputObject.sunday.opentime,
                                closeTime: inputObject.sunday.closeTime
                            };
                            db.collection(inputObject.restaurant).insertOne(insertObject, function(error, result)
                            {
                                if (error)
                                {
                                    db.close();
                                    console.log("Restaurant creation failed.");
                                }
                                else
                                {
                                    var insertObject = 
                                    {
                                        hoursOfOperation: 1,
                                        openTime: inputObject.monday.opentime,
                                        closeTime: inputObject.monday.closeTime
                                    };

                                    db.collection(inputObject.restaurant).insertOne(insertObject, function(error, result)
                                    {
                                        if (error)
                                        {
                                            db.close();
                                            console.log("Restaurant creation failed.");
                                        }
                                        else
                                        {
                                            var insertObject = 
                                            {
                                                hoursOfOperation: 2,
                                                openTime: inputObject.tuesday.opentime,
                                                closeTime: inputObject.tuesday.closeTime
                                            };
        
                                            db.collection(inputObject.restaurant).insertOne(insertObject, function(error, result)
                                            {
                                                if (error)
                                                {
                                                    db.close();
                                                    console.log("Restaurant creation failed.");
                                                }
                                                else
                                                {
                                                    var insertObject = 
                                                    {
                                                        hoursOfOperation: 3,
                                                        openTime: inputObject.wednesday.opentime,
                                                        closeTime: inputObject.wednesday.closeTime
                                                    };
                
                                                    db.collection(inputObject.restaurant).insertOne(insertObject, function(error, result)
                                                    {
                                                        if (error)
                                                        {
                                                            db.close();
                                                            console.log("Restaurant creation failed.");
                                                        }
                                                        else
                                                        {
                                                            var insertObject = 
                                                            {
                                                                hoursOfOperation: 4,
                                                                openTime: inputObject.thursday.opentime,
                                                                closeTime: inputObject.thursday.closeTime
                                                            };
                        
                                                            db.collection(inputObject.restaurant).insertOne(insertObject, function(error, result)
                                                            {
                                                                if (error)
                                                                {
                                                                    db.close();
                                                                    console.log("Restaurant creation failed.");
                                                                }
                                                                else
                                                                {
                                                                    var insertObject = 
                                                                    {
                                                                        hoursOfOperation: 5,
                                                                        openTime: inputObject.friday.opentime,
                                                                        closeTime: inputObject.friday.closeTime
                                                                    };
                                
                                                                    db.collection(inputObject.restaurant).insertOne(insertObject, function(error, result)
                                                                    {
                                                                        if (error)
                                                                        {
                                                                            db.close();
                                                                            console.log("Restaurant creation failed.");
                                                                        }
                                                                        else
                                                                        {
                                                                            var insertObject = 
                                                                            {
                                                                                hoursOfOperation: 6,
                                                                                openTime: inputObject.saturday.opentime,
                                                                                closeTime: inputObject.saturday.closeTime
                                                                            };
                                        
                                                                            db.collection(inputObject.restaurant).insertOne(insertObject, function(error, result)
                                                                            {
                                                                                if (error)
                                                                                {
                                                                                    db.close();
                                                                                    console.log("Restaurant creation failed.");
                                                                                }
                                                                                else
                                                                                {
                                                                                    db.close();
                                                                                    console.log("Restaurant creation succeeded.");
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}

exports.deleteRestaurant = function(inputObject)
{
    dbConnect(function(error, db)
    {
        if (error)
        {
            db.close();
            console.log("Delete restaurant failed.");
        }
        else
        {
            db.collection(inputObject.restaurant).drop(function(error, result)
            {
                if (error)
                {
                    db.close();
                    console.log("Delete restaurant failed.");
                }
                else
                {
                    db.close();
                    console.log("Delete restaurant succeeded.");
                }
            });
        }
    });
}