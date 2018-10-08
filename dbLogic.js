var MongoClient = require('mongodb').MongoClient;

// The prefix prepended to restaurant names to create/access
// a restaurant's current reservations collection.
//
var prefixForCurrentReservationCollection = "Current_";

// The prefix prepended to restaurant names to create/access
// a restaurant's old reservations collection.
//
var prefixForOldReservationCollection = "Old_";

// Name of the table containing the list of names
// of the restaurants in the database.
//
var restaurantsTableName = "Restaurants";

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
            functionOnComplete(error, null);
        }
        else
        {
            var restaurantNameQuery = 
            {
                restaurantName: inputObject.restaurant
            };
            
            db.collection(restaurantsTableName).findOne(restaurantNameQuery, function(error, result)
            {
                if (error)
                {
                    db.close();
                    functionOnComplete(error, null);
                }
                else
                {
                    if (!result)
                    {
                        db.close();
                        var errorObject = 
                        {
                            error: "Restaurant does not exist."
                        };
                        functionOnComplete(errorObject, null);
                    }
                    else
                    {
                        var insertObject = 
                        {
                            timeOfReservation: inputObject.timeOfReservation,
                            nameOfReservation: inputObject.nameOfReservation,
                            numberOfGuests: inputObject.numberOfGuests
                        };
            
                        var nameOfCollection = 
                            prefixForCurrentReservationCollection +
                            inputObject.restaurant;

                        db.collection(nameOfCollection).insertOne(insertObject, function(error, result)
                        {   
                            db.close();
                            functionOnComplete(error);
                        });
                    }
                }
            });
        }
    });
}

exports.findReservation = function(inputObject, functionOnComplete)
{
    findReservationHelper(inputObject, db, function(error, result)
    {
        db.close();
        functionOnComplete(error, result);
    });
}

var findReservationHelper = function(inputObject, db, functionOnComplete)
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
                nameOfReservation: inputObject.nameOfReservation
            };

            var nameOfCollection = 
                prefixForCurrentReservationCollection +
                inputObject.restaurant;

            db.collection(nameOfCollection).findOne(findObject, function(error, result)
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
        if (error)
        {
            db.close();
            functionOnComplete(error, null);
        }
        else
        {
            // Move the reservation to the old collection.
            //
            var insertObject = 
            {
                timeOfReservation: inputObject.timeOfReservation,
                nameOfReservation: inputObject.nameOfReservation,
                numberOfGuests: result.numberOfGuests
            };

            var nameOfOldCollection = 
                prefixForOldReservationCollection +
                inputObject.restaurant;
        
            db.collection(nameOfOldCollection).insertOne(insertObject, function(error, result)
            {
                if (error)
                {
                    db.close();
                    functionOnComplete(error, null);
                }
                else
                {
                    // Delete the original reservation.
                    //
                    var deleteObject = 
                    {
                        timeOfReservation: inputObject.timeOfReservation,
                        nameOfReservation: inputObject.nameOfReservation,
                    };

                    var nameOfNewCollection =
                        prefixForCurrentReservationCollection +
                        inputObject.restaurant;

                    db.collection(nameOfNewCollection).deleteOne(deleteObject, function(error, result)
                    {   
                        db.close();
                        functionOnComplete(error, null);
                    });
                }
            });
        }
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
            // Create range around reservation time to search for existing 
            // reservations.  Then, use this range to create a query object 
            // to use to search for table availability.
            //
            var hourAndHalfInMilliseconds = 5400000.0;
            var upperRange = inputObject.timeOfReservation.valueOf() + hourAndHalfInMilliseconds;
            var lowerRange = inputObject.timeOfReservation.valueOf() - hourAndHalfInMilliseconds;
            var availabilityQuery = 
            {
                timeOfReservation: 
                {
                    $gt: lowerRange,
                    $lt: upperRange
                }
            };

            var nameOfCollection =
                prefixForCurrentReservationCollection +
                inputObject.restaurant;

            db.collection(nameOfCollection).find(availabilityQuery, function(error, foundReservations)
            {
                if (error)
                {
                    db.close();
                    functionOnComplete(error, null);
                }
                else
                {
                    // Count the number of seats occupied during the queried 
                    // period of time.
                    //
                    var seatsTaken = 0;
                    foreach (reservation in foundReservations)
                    {
                        seatsTaken += reservation.numberOfGuests
                    }

                    // Get the maximum occupancy of the restaurant.
                    //
                    var restaurantNameQuery = 
                    {
                        restaurantName: inputObject.restaurant
                    };
                    
                    db.collection(restaurantsTableName).findOne(restaurantNameQuery, function(error, result)
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
    dbConnect(function(error, db)
    {
        if (error)
        {
            db.close();
            functionOnComplete(error, null);
        }
        else
        {
            var potentialReservationDateObject = new Date(inputObject.timeOfReservation);
            var dayOfWeekOfPotentialReservation = potentialReservationDateObject.getDay();
            var restaurantNameQuery = 
            {
                restaurantName: inputObject.restaurant
            };
            
            db.collection(restaurantsTableName).findOne(restaurantNameQuery, function(error, result)
            {
                db.close();
                if (error)
                {
                    functionOnComplete(error, null);
                }
                else
                {
                    var dayOfPotentialReservation = potentialReservationDateObject.getDay();

                    var hoursOfPotentialReservation = potentialReservationDateObject.getHours();
                    var minutesOfPotentialReservationInHours = potentialReservationDateObject.getMinutes()/60.0;
                    var totalHoursOfPotentialReservation = hoursOfPotentialReservation + minutesOfPotentialReservationInHours;

                    var totalHoursAsMilliseconds = 3600000.0 * totalHoursOfPotentialReservation;

                    var isValidTimeForReservation = 
                        totalHoursAsMilliseconds >= result[dayOfPotentialReservation].open && 
                        totalHoursAsMilliseconds < result[dayOfPotentialReservation].close;
                    
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