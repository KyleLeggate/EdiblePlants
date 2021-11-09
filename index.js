//Alexa skill for the Edible Plant Database
//Kyle Leggate
//25/04/2021
//Based on the template from https://drive.google.com/drive/folders/0B7TGomMdILscblZuSXM4bjJYcmc

const request = require("request");
const repromptText = "You can ask about which months to start growing a particular plant, which plants you can grow in a given month, or for more details about a particular plant. " +
                        "You can also ask about how recent weather will affect your plants, or have Alexa remember what your growing.";


// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function(event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.application.applicationId !== "amzn1.ask.skill.68c6b95f-dce0-4db9-8316-7c0a9d393e72") {
            context.fail("Invalid Application ID");
        }
        
        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId},
                                                    event.session);
        }

        //if the skill has just been launched with no intent
        if (event.request.type === "LaunchRequest") { 
            onLaunch(event.request,
                event.session,
                event.context,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes,
                                                speechletResponse));
                });
        //if the request has an intent
        } else if (event.request.type === "IntentRequest") { 
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes,
                                                speechletResponse));
                });
        //if the session is being ended
        } else if (event.request.type === "SessionEndedRequest") { 
            onSessionEnded(event.request, event.session, context.succeed())
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("new session");
    console.log(session.user.userId);
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, context, callback) {
    getWelcomeResponse(context, callback)
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {

    var intent = intentRequest.intent;
    var intentName = intentRequest.intent.name;

    // dispatch custom intents to handlers here
    if (intentName == "PlantQueryIntent") {
        PlantQueryIntentHandler(intent, session, callback);
    } else if (intentName == "AMAZON.FallbackIntent") {
        FallbackIntentHandler(intent, session, callback);
    } else if (intentName == "AMAZON.CancelIntent") {
        CancelIntentHandler(intent, session, callback);
    } else if (intentName == "AMAZON.StopIntent") {
        StopIntentHandler(intent, session, callback);
    } else if (intentName == "AMAZON.HelpIntent") {
        HelpIntentHandler(intent, session, callback);
    } else if (intentName == "WeatherIntent") {
        WeatherIntentHandler(intent, session, callback);
    } else if (intentName == "RememberIntent") {
        RememberIntentHandler(intent, session, callback);
    } else if (intentName == "ForgetIntent") {
        ForgetIntentHandler(intent, session, callback);
    } else if (intentName == "RecallIntent") {
        RecallIntentHandler(intent, session, callback);
    } else if (intentName == "MonthQueryIntent") {
        MonthQueryIntentHandler(intent, session, callback);
    } else if (intentName == "PlantDataIntent") {
        PlantDataIntentHandler(intent, session, callback);
    } else {
         throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {

}

// ------- Skill specific logic -------

//// INTENT HANDLERS ////

//Called when the user starts the skill
function getWelcomeResponse(context, callback) {
    var speechOutput = "Welcome, you can ask about a specific plant, what to plant at a certain time of year, or add what you're growing to your Virtual Garden.";
    var reprompt = repromptText;
    var header = "";

    var shouldEndSession = false;

    var sessionAttributes = {
        "speechOutput" : speechOutput,
        "repromptText" : reprompt
    };

    callback(sessionAttributes, buildSpeechletResponse(header, speechOutput, reprompt, shouldEndSession));
}

//Amazon function, for when the user asks for help
function HelpIntentHandler(intent, session, callback) {
    var speechOutput = repromptText;
    var reprompt = repromptText;
    var header = "";

    var shouldEndSession = false;

    callback(session.attributes, buildSpeechletResponse(header, speechOutput, reprompt, shouldEndSession));
}

//Amazon function, for when no other intent is detected
function FallbackIntentHandler(intent, session, callback) {
    var speechOutput = repromptText;
    var reprompt = repromptText;
    var header = "";

    var shouldEndSession = false;

    callback(session.attributes, buildSpeechletResponse(header, speechOutput, reprompt, shouldEndSession));
}

//Amazon function, for when the user asks to cancel the interaction
function CancelIntentHandler(intent, session, callback) {
    var speechOutput = "";
    var reprompt = "";
    var header = "";

    var shouldEndSession = true;

    callback(session.attributes, buildSpeechletResponse(header, speechOutput, reprompt, shouldEndSession));
}

//Amazon function, for when the user asks to stop the interaction
function StopIntentHandler(intent, session, callback) {
    var speechOutput = "";
    var reprompt = "";
    var header = "";

    var shouldEndSession = true;
    
    callback(session.attributes, buildSpeechletResponse(header, speechOutput, reprompt, shouldEndSession));
}

//PlantQueryIntent, used to give the planting and harvesting months for any given plant
function PlantQueryIntentHandler(intent, session, callback) {
    var speechOutput = "";
    var reprompt = repromptText;
    var shouldEndSession = false;

    //if there is no value in the {plant} slot, say we don't know that plant
    if(intent.slots.plant.resolutions.resolutionsPerAuthority[0].values == undefined)
    {
        speechOutput = "Sorry, I don't recognise that plant. You could try using another common name for it, or you could choose a similar plant.";
        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, reprompt, shouldEndSession));
    }
    else
    {
        var plant = intent.slots.plant.resolutions.resolutionsPerAuthority[0].values[0].value.name;

        //callback for the http request
        getHttps(0, plant, function(data) {
            var outdoorStart = getMonth(data.outdoorStart-1);
            var outdoorEnd = getMonth(data.outdoorEnd-1);
            var harvestStart = getMonth(data.harvestStart-1);
            var harvestEnd = getMonth(data.harvestEnd-1);

            if(data.indoorStart == 0) //if there is no indoor planting months
            {
                speechOutput = data.plant + " should be planted outdoors from " + outdoorStart + " to " + outdoorEnd + 
                                            ", and will be ready for harvest between " + harvestStart + " and " + harvestEnd;
            } else {
                var indoorStart = getMonth(data.indoorStart-1);
                var indoorEnd = getMonth(data.indoorEnd-1);
                speechOutput = data.plant + " should be planted indoors or under cover from " + indoorStart + " to " + indoorEnd + 
                                            ", transferred outside from " + outdoorStart + " to " + outdoorEnd + 
                                            ", and will be ready for harvest between " + harvestStart + " and " + harvestEnd;
            }   

            callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, reprompt, shouldEndSession));
        });
    }
}

//MonthQueryIntent, used to give suggestions on what to plant in a given month
function MonthQueryIntentHandler(intent, session, callback) {
    var speechOutput = "";
    var reprompt = repromptText;
    var shouldEndSession = false;

    var query = "";
    var month = intent.slots.month.value;

    if(month == null) //if the user didn't supply a specific month, then use {relativeMonth}
    {
        var d = new Date();
        console.log(d.getMonth());

        if(intent.slots.relativeMonth.value == "next") //if the user is asking about next month
        {
            query = d.getMonth() + 2; //needs to be incremented, since the months in the database start from January=1, not 0
        }
        else //if the user is asking about the current month
        {
            query = d.getMonth() + 1;
        }
    }
    else //if the user supplied a specific month
    {
        query = getMonthIndex(month) + 1;
        console.log(month);
    }

    console.log(query);

    //callback function for the http request
    getHttps(3, query, function(data) {
        if(data == 0) //if no plants are returned
        {
            speechOutput = "Sorry, there are no plants suitable to start growing in that month. Most plants can be grown from March onwards, ending in August.";
        }
        else
        {
            speechOutput = "Here are some plants that you could start growing: ";
            for(i = 0; i < data.length-1; i++)
            {
                speechOutput += data[i] + ", ";
            }

            speechOutput += "and " + data[data.length-1] + ". You can ask about any of these plants for more information.";
        }

        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, reprompt, shouldEndSession));
    });
}

//WeatherIntent, used to give advice on how the weather might affect a uses plants
function WeatherIntentHandler(intent, session, callback) {
    var speechOutput = "";
    var reprompt = repromptText;
    var shouldEndSession = false;

    var userID = session.user.userId.split(".")[3]; //get the user's unique ID

    getHttps(2, "&q=Dundee&days=1", function(weatherData) { //get weather data based on location
        getHttps(1, userID, function(userData) { //get all of a user's plants
            var tenderPlants = [];
            var highWaterPlants = [];
            var lowWaterPlants = [];

            for(var i = 0; i < userData.length; i++) //seperate all of the user's plants based on attributes
            {
                if(userData[i].temp.toUpperCase() == "VERY TENDER" || userData[i].temp.toUpperCase() == "TENDER") //vulnerable to cold weather
                {
                    tenderPlants.push(userData[i].plant);
                }

                if(userData[i].water.toUpperCase() == "VERY HIGH" || userData[i].water.toUpperCase() == "HIGH") //needs lots of water
                {
                    highWaterPlants.push(userData[i].plant);
                }
                else if(userData[i].water.toUpperCase() == "VERY LOW" || userData[i].water.toUpperCase() == "LOW") //needs less water
                {
                    lowWaterPlants.push(userData[i].plant);
                }
            }

            var temp =  [weatherData.forecast.forecastday[0].day.avgtemp_c, weatherData.current.temp_c]; //get the average and current temperature
            var condition = [weatherData.forecast.forecastday[0].day.condition.code, weatherData.current.condition.code]; //get the forecasted and current weather condition

            const tempLow = 2; //cold temp
            const tempHigh = 23; //hot temp
            const rainCodes = [1183, 1186, 1189, 1192, 1195, 1201, 1276]; //rain codes from weatherAPI.com
            
            if(rainCodes.includes(condition[0]) || rainCodes.includes(condition[1])) //if there is rain
            {
                speechOutput = "Due to the recent rain, make sure not to give your plants too much water. ";

                if(lowWaterPlants.length > 1) //if the user has more than 1 plant that doesn't need much water
                {
                    speechOutput += " Some of your plants don't require much water, these include your: "

                    for(var i = 0; i < lowWaterPlants.length-1; i++)
                    {
                        speechOutput += lowWaterPlants[i] + ", ";
                    }
                    speechOutput += "and " + lowWaterPlants[lowWaterPlants.length-1];
                }
                else if(lowWaterPlants.length == 1) //if the user has one plant that doesn't need much water
                {
                    speechOutput += " Your " + lowWaterPlants[0] + " don't require much water, so be careful with them.";
                }
                
                if(temp[0] < tempLow || temp[1] < tempLow)
                {
                    speechOutput += " Also, ";
                }
            }
            else if(temp[0] > tempHigh || temp[1] > tempHigh) //if there is not rain, and the temperature is high
            {
                speechOutput += "Due to the recent high temperatures, consider watering your plants more than normal. ";

                if(highWaterPlants.length > 1) //if the user has more than one plant that needs lots of water
                {
                    speechOutput += "Some of your plants normally need a lot of water, these include your: "

                    for(var i = 0; i < highWaterPlants.length-1; i++)
                    {
                        speechOutput += highWaterPlants[i] + ", ";
                    }
                    speechOutput += "and " + highWaterPlants[highWaterPlants.length-1] + " so be sure they are well watered. ";
                }
                else if(highWaterPlants.length == 1) //if the user has exactly one plant that needs lots of water
                {
                    speechOutput += "Your " + highWaterPlants[0] + " need a lot of water, so make sure to give them enough. ";
                }
            }

            if(temp[0] < tempLow || temp[1] < tempLow) //if the temperature is very low
            {
                speechOutput += "Due to the recent low temperatures, consider sheltering your plants to prevent frost from damaging them. ";

                if(tenderPlants.length > 1) //if the user has multiple tender plants
                {
                    speechOutput += " Some of your plants are vulnerable to the cold, these include: "

                    for(var i = 0; i < tenderPlants.length-1; i++)
                    {
                        speechOutput += tenderPlants[i] + ", ";
                    }
                    speechOutput += "and " + tenderPlants[tenderPlants.length-1] + " so be sure to pay them close attention. ";
                }
                else if(tenderPlants.length == 1) //if the user has one tender plant
                {
                    speechOutput += " Your " + tenderPlants[0] + " are vulnerable to the cold, so be sure to pay them close attention. ";
                }
            }

            if(speechOutput == "") //if no other 'if' statement has been entered, use a default string
            {
                speechOutput = "Recent weather seems to be suitable for your plants. Make sure you're giving them enough water, " + 
                                "and that they're getting enough sunlight. In warmer weather, you may have to water them more, " + 
                                "and as temperatures get colder you should watch out for frost damage on vulnerable plants.";
            }

            callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, reprompt, shouldEndSession));
        });
    });
}

//RememberIntent, which add user plants to the database
function RememberIntentHandler(intent, session, callback) {
    var speechOutput = "";
    var reprompt = repromptText;
    var shouldEndSession = false;

    if(intent.slots.plant.resolutions.resolutionsPerAuthority[0].values == undefined) //if the plant is not recognised
    {
        speechOutput = "Sorry, I don't recognise that plant. You could try using another common name for it, or you could choose a similar plant.";
        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, reprompt, shouldEndSession));
    }
    else
    {
        var userID = session.user.userId.split(".")[3]; //get the user's ID
        var plant = intent.slots.plant.resolutions.resolutionsPerAuthority[0].values[0].value.name;

        postHttps(1, userID, plant, function(data) {
            if(data = 1) //the plant has been succefully added to the database
            {
                speechOutput = "I'll remember that your growing " + plant + " in your garden.";
            }
            else //the plant was already in the database
            {
                speechOutput = "You've already added " + plant + " to your Virtual Garden.";
            }
            callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, reprompt, shouldEndSession));
        });
    }
}

//ForgetIntent, removes a user's plant from the database
function ForgetIntentHandler(intent, session, callback) {
    var speechOutput = "";
    var reprompt = repromptText;
    var shouldEndSession = false;

    if(intent.slots.plant.resolutions.resolutionsPerAuthority[0].values == undefined) //if the plant is not recognised
    {
        speechOutput = "Sorry, I don't recognise that plant. You could try using another common name for it, or you could choose a similar plant.";
        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, reprompt, shouldEndSession));
    }
    else
    {
        var userID = session.user.userId.split(".")[3]; //get the user's ID
        var plant = intent.slots.plant.resolutions.resolutionsPerAuthority[0].values[0].value.name;

        deleteHttps(1, userID, plant, function(data) {
            if(data == "1") //the plant has been succefully removed from the database
            {
                speechOutput = "I've removed " + plant + " from your virtual garden.";
            }
            else //the plant wasn't in the database
            {
                speechOutput = "I couldn't find " + plant + "in your virtual garden. It has either been removed already, or was never added.";
            }
            callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, reprompt, shouldEndSession));
        });
    }
}

//RecallIntent, list the user's stored plants
function RecallIntentHandler(intent, session, callback) {
    var speechOutput = "";
    var reprompt = repromptText;
    var shouldEndSession = false;

    var userID = session.user.userId.split(".")[3]; //get the user's ID

    getHttps(1, userID, function(data) {
        if(data.length == 1) //for 1 plant
        {
            speechOutput = "Currently you only have " + data[0].plant + " in your Virtual Garden.";
        }
        else if(data.length > 1) //for multiple plants
        {
            speechOutput = "You've added the following plants to your Virtual Garden: ";
            for(i = 0; i < data.length-1; i++)
            {
                speechOutput += data[i].plant + ", ";
            }

            speechOutput += "and " + data[data.length-1].plant;
        }
        else //for 0 plants
        {
            speechOutput = "I couldn't find any plants in your Virtual Garden. You can ask me to remember any plants that you are growing."
        }
        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, reprompt, shouldEndSession));
    });
}

function PlantDataIntentHandler(intent, session, callback) {
    var speechOutput = "";
    var reprompt = repromptText;
    var shouldEndSession = false;
    
    if(intent.slots.plant.resolutions.resolutionsPerAuthority[0].values == undefined) //if the plant is not recognised
    {
        speechOutput = "Sorry, I don't recognise that plant. You could try using another common name for it, or you could choose similar plant.";
        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, reprompt, shouldEndSession));
    }
    else
    {
        var plant = intent.slots.plant.resolutions.resolutionsPerAuthority[0].values[0].value.name;

        getHttps(4, plant, function(data) {
            if(data == null) //if the plant was recognised, but data wasn't available from the API
            {
                speechOutput = "Sorry, I don't know about that plant.";
            }
            else
            {
                speechOutput = data.plant;

                data.water = data.water.toUpperCase();
                if(data.water == "VERY HIGH" || data.water == "HIGH") //plant needsa a lot of water
                {
                    speechOutput += " need lots of water comapred to most other plants to grow. ";
                }
                else if(data.water == "MEDIUM") //needs average water
                {
                    speechOutput += " need a normal amount of water to grow. ";
                }
                else if(data.water == "LOW" || data.water == "VERY LOW") //needs less water
                {
                    speechOutput += " don't need as much water as most other plants to grow properly. ";
                }

                speechOutput += "Also, they are";

                data.temp = data.temp.toUpperCase();
                if(data.temp == "VERY HARDY" || data.temp == "HARDY") //plant is resistant to frost
                {
                    speechOutput += " hardy plants that are more resistant to low temperatures than most plants, though they are not impervious to frost, and care should still " + 
                                    "be taken in cold weather.";
                }
                else if(data.temp == "HALF HARDY") //plant is not resistant to frost
                {
                    speechOutput += " not resistant to frost, so care should be taken whenever temperatures drop.";
                }
                else if(data.temp == "TENDER" || data.temp == "VERY TENDER") //plant is vulnerable to frost
                {
                    speechOutput += " tender plants which are very vulnerable to low temperatures, and close attention should be paid to them in cold weather. " + 
                                    "Consider covering them, growing then indoors or in a greenhouse if possible.";
                }
            }   

            callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, reprompt, shouldEndSession));
        });
    }
}



//// HTTPS REQUESTS ////

//gets a url, and adds on the input query
function urls(index, query) {
    if (index == 0)
    {
        return "https://edibleplantsapi.azurewebsites.net/api/PlantingCalendar/"
        + query;
    }
    else if (index == 1)
    {
        return "https://edibleplantsapi.azurewebsites.net/api/UserData/"
        + query;
    }
    else if (index == 2)
    {
        return "https://api.weatherapi.com/v1/forecast.json?key=128954a67f3d43e4a10131346210802" + query;
    }
    else if (index == 3)
    {
        return "https://edibleplantsapi.azurewebsites.net/api/PlantingCalendar/month/" + query;
    }
    else if (index == 4)
    {
        return "https://edibleplantsapi.azurewebsites.net/api/PlantData/" + query;
    }
    else if(index == 5)
    {
        return "https://edibleplantsapi.azurewebsites.net/api/Main/ping";
    }
}

//Sends a POST request to the target URL, given by urlIndex
//u: a user's ID, to be used in the query string
//p: a plants name, to be used in the query string
//returns: a JSON object of the responses body
function postHttps(urlIndex, u, p, callback) {
    var uri = urls(urlIndex, "").slice(0, -1) + "?userID=" + u + "&plant=" + p;

    request.post(uri, function (error, response, body) {
        callback(JSON.parse(body));
    });
}

//Sends a DELETE request to the target URL, given by urlIndex
//u: a user's ID, to be used in the query string
//p: a plants name, to be used in the query string
//returns: a JSON object of the responses body
function deleteHttps(urlIndex, u, p, callback) {
    var uri = urls(urlIndex, "").slice(0, -1) + "?userID=" + u + "&plant=" + p;

    request.delete(uri, function(error, response, body) {
        callback(JSON.parse(body));
    });
}

//Sends a GET request to the target URL, given by urlIndex
//query: a value to be added to the URL
//returns: a JSON object of the responses body
function getHttps(urlIndex, query, callback) {
    request.get(urls(urlIndex, query), function(error, response, body) {
        callback(JSON.parse(body));
    });
}

const months = ["January", "Febuary", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function getMonth(index) {
    return months[index];
}

function getMonthIndex(month) {
    return months.indexOf(month);
}



//// Functions to build responses for Alexa ////
//// From https://drive.google.com/drive/folders/0B7TGomMdILscblZuSXM4bjJYcmc
function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}