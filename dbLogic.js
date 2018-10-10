// Require statements.
//
var MongoClient = require('mongodb').MongoClient;

// TODO: (If Time)
//  Move all groupings of constants to their own configuration file
//  or, at the very least, a common configuration file.
//

// Constants for database connection.
//

// URL of database.
//
var dbUrl = "mongodb://localhost:27017/dataDb";

// Constants for database naming.
//

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

// Constants for working with time.
//

// Hour in milliseconds.
//
var hourInMilliseconds = 3600000.0;

// Hour and a half in milliseconds.
//
var hourAndHalfInMilliseconds = hourInMilliseconds * 1.5;

// Reservations can only occur on half hours (i.e. times ending with :00 and :30).
//
var reservationTimeIncrement = hourInMilliseconds/2.0;

var dbConnect = function(functionOnComplete)
{    
    MongoClient.connect(dbUrl, function(error, db)
    {
        // The caller is responsible for closing the db connection.
        //

        // TODO: (If time)
        //  Pass in two function objects:
        //   1. The function to execute before closing the database connection.
        //   2. The callback function to call once the db connection is closed.
        //  This will enable me to close the db connection here thus tidying 
        //  up the code and removing the need for internal knowledge of this
        //  function.

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
            var upperRange = inputObject.timeOfReservation + hourAndHalfInMilliseconds;
            var lowerRange = inputObject.timeOfReservation - hourAndHalfInMilliseconds;
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

                    var hoursOfPotentialReservation = 
                        potentialReservationDateObject.getHours();
                    var minutesOfPotentialReservationInHours = 
                        potentialReservationDateObject.getMinutes()/60.0;
                    var totalHoursOfPotentialReservation = 
                        hoursOfPotentialReservation + minutesOfPotentialReservationInHours;

                    var totalHoursAsMilliseconds = 
                        hourInMilliseconds * totalHoursOfPotentialReservation;

                    var isValidTimeForReservation = 
                        totalHoursAsMilliseconds >= result[dayOfPotentialReservation].open && 
                        totalHoursAsMilliseconds < result[dayOfPotentialReservation].close &&
                        totalHoursAsMilliseconds%reservationTimeIncrement == 0;
                    
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
exports.createRestaurant = function(restaurantObject, functionOnComplete)
{
    dbConnect(function(error, db)
    {
        if (error)
        {
            db.close();
            console.log("Restaurant creation failed.  Unable to open database.\n");
            functionOnComplete();
        }
        else
        {
            db.collection(restaurantsTableName).insertOne(restaurantObject, function(error)
            {
                db.close();
                if (error)
                {
                    console.log("Restaurant creation failed.  Unable to insert restaurant data.\n");
                }
                else
                {
                    console.log("Restaurant creation succeeded.\n");
                }
                functionOnComplete();
            });
        }
    });
}

/////////////////////////////////////////////////////
// Test tasks.
/////////////////////////////////////////////////////

// Test Constants
//

// Test Restaurant Name
//
var testRestaurantName = "TestRestaurantOne";

// Test reservation time for unix time for 20:00 on December 1, 2018
//
var testReservationTimeOne = 1543694400;

// Test reservation Name
//
var testReservationName = "PersonOne";

// Test number of Guests
//
var testNumberOfGuests = 4;

// NOTE!!!
// Run tests in the order they appear in this file!!
//
exports.createTestRestaurant = function(inputObject)
{
    var testRestaurantHours = 
    {
        0:
        {
            open: 32400000.0,
            close: 82800000.0
        },
        1:
        {
            open: 32400000.0,
            close: 82800000.0
        },
        2:
        {
            open: 32400000.0,
            close: 82800000.0
        },
        3:
        {
            open: 32400000.0,
            close: 82800000.0
        },
        4:
        {
            open: 32400000.0,
            close: 82800000.0
        },
        5:
        {
            open: 32400000.0,
            close: 82800000.0
        },
        6:
        {
            open: 32400000.0,
            close: 82800000.0
        }
    };
    var testRestaurantMaximumOccupancy = 20;
    var testRestaurantObject = 
    {
        restaurantName: testRestaurantName,
        hoursOfOperation: testRestaurantHours,
        maxOccupancy: testRestaurantMaximumOccupancy
    };

    console.log("Start of test restaurant creation.\n");

    createRestaurant(testRestaurantObject, function()
    {
        console.log("End of test restaurant creation.\n");
    });
}

exports.insertTestReservation = function()
{
    var testInsertObject = 
    {
        timeOfReservation: testReservationTimeOne, 
        nameOfReservation: testReservationName,
        numberOfGuests: testNumberOfGuests,
        restaurant: testRestaurantName
    };
    console.log("Starting Test Insert...\n");
    insertReservation(testInsertObject, function(error)
    {
        if (error)
        {
            console.log("Test Insert Failed.\n");
        }
        else
        {
            console.log("Test Insert Succeeded.\n");
            console.log("Check MongoDB terminal for successful insertion.\n");
        }
    });
}

exports.findTestReservation = function()
{
    var testFindObject = 
    {
        timeOfReservation: testReservationTimeOne,
        nameOfReservation: testReservationName,
        restaurant: testRestaurantName
    };
    console.log("Starting Test Find...\n");
    findReservation(testFindObject, function(error, testResult) 
    {
        if (error)
        {
            console.log("Test find failed.\n");
        }
        else
        {
            if (testResult)
            {
                console.log("Reservation Found:\n");
                console.log(JSON.stringify(testResult));
                console.log("\n\n");
            }
            else
            {
                console.log("Test find failed.  Existing object not found.\n");
            }
        }
    });
}

exports.testSeatsAvailableForReservation = function()
{
    var testReservationTimeQueryObject = 
    {
        timeOfReservation: testReservationTimeOne,
        restaurant: testRestaurantName
    };
    console.log("Starting Test Search for Available Seats...\n");
    seatsAvailableForReservation(testReservationTimeQueryObject, function(error, result)
    {
        if (error)
        {
            console.log("Test search for seats available for reservation failed.\n");
        }
        else
        {
            console.log("Number of seats available: " + JSON.stringify(result) + "\n");
        }
    });
}

exports.deleteTestReservation = function()
{
    var testDeleteObject = 
    {
        timeOfReservation: testReservationTimeOne,
        nameOfReservation: testReservationName,
        restuarant: testRestaurantName
    };
    console.log("Starting Test Deletion...\n");
    deleteReservation(testDeleteObject, function(error, result)
    {
        if (error)
        {
            console.log("Test deletion failed.\n");
        }
        else
        {
            console.log("Test deletion succeeded.\n");
            console.log("Check both the old and current reservations in the MongoDB terminal.");
        }
    });
}

exports.testValidTimeForReservation = function()
{
    var testReservationTimeQueryObject = 
    {
        timeOfReservation: testReservationTimeOne,
        restaurant: testRestaurantName
    };

    console.log("Starting Valid Time for Reservation Test...\n");
    validTimeForReservation(testReservationTimeQueryObject, function(error, result)
    {
        if (error)
        {
            console.log("Test time validation failed.\n");
        }
        else
        {
            console.log("Is Valid Time => " + JSON.stringify(result) + "\n");
        }
    });
}