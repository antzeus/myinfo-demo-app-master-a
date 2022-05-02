var express = require('express');
var router = express.Router();

const restClient = require('superagent-bluebird-promise');
const path = require('path');
const url = require('url');
const util = require('util');
const Promise = require('bluebird');
const _ = require('lodash');
const querystring = require('querystring');
const securityHelper = require('../lib/security/security');
const crypto = require('crypto');
const colors = require('colors');
var myUtil=require('../lib/util/util');
const fs = require('fs');
const myConsole = new console.Console(fs.createWriteStream('./output' + myUtil.getVersion() + '.txt'));

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


// ####################
// Setup Configuration
// ####################
myConsole.log(myUtil.getmyfulldate() + " | index.js");
myConsole.log("###################");
myConsole.log("SETUP CONFIGURATION");
myConsole.log("###################");

// LOADED FRON ENV VARIABLE: public key from MyInfo Consent Platform given to you during onboarding for RSA digital signature
var _publicCertContent = process.env.MYINFO_SIGNATURE_CERT_PUBLIC_CERT;
// LOADED FRON ENV VARIABLE: your private key for RSA digital signature
var _privateKeyContent = process.env.DEMO_APP_SIGNATURE_CERT_PRIVATE_KEY;
// LOADED FRON ENV VARIABLE: your client_id provided to you during onboarding
var _clientId = process.env.MYINFO_APP_CLIENT_ID;
// LOADED FRON ENV VARIABLE: your client_secret provided to you during onboarding
var _clientSecret = process.env.MYINFO_APP_CLIENT_SECRET;
// redirect URL for your web application
var _redirectUrl = process.env.MYINFO_APP_REDIRECT_URL;


// URLs for MyInfo APIs
var _authLevel = process.env.AUTH_LEVEL;

var _authApiUrl = process.env.MYINFO_API_AUTHORISE;
var _tokenApiUrl = process.env.MYINFO_API_TOKEN;
var _personApiUrl = process.env.MYINFO_API_PERSON;

//var _attributes = "uinfin,name,sex,race,nationality,dob,email,mobileno,regadd,housingtype,hdbtype,marital,edulevel,noa-basic,ownerprivate,cpfcontributions,cpfbalances";
var _attributes = "uinfin,name,sex,race,nationality,dob,email,mobileno,regadd,marital,noa-basic,residentialstatus,occupation";

myConsole.log("Public Cert : " + _publicCertContent);
myConsole.log("Private Key : " + _privateKeyContent);
myConsole.log("Client ID : " + _clientId);
myConsole.log("Client Secret : " + _clientSecret);
myConsole.log("Redirect URL : " + _redirectUrl);
myConsole.log("Auth Level : " + _authLevel);
myConsole.log("Auth API URL : " + _authApiUrl);
myConsole.log("Token API URL : " + _tokenApiUrl);
myConsole.log("Person API URL : " + _personApiUrl);
myConsole.log("Attributes : " + _attributes);

/* GET home page. */
router.get('/', function(req, res, next) {
	myConsole.log(myUtil.getmyfulldate() + " | === GET home page === ");
  myConsole.log("  " + path.join(__dirname + '/../views/html/index.html'))
  res.sendFile(path.join(__dirname + '/../views/html/index.html'));
});

// callback function - directs back to home page
router.get('/callback', function(req, res, next) {
	myConsole.log(myUtil.getmyfulldate() + " | === CALLBACK page === ");
  myConsole.log(myUtil.getmyfulldate() + " |  directs back to " + path.join(__dirname + '/../views/html/index.html'))
  res.sendFile(path.join(__dirname + '/../views/html/index.html'));
});

// function for getting environment variables to the frontend
router.get('/getEnv', function(req, res, next) {
  if (_clientId == undefined || _clientId == null)
    res.jsonp({
      status: "ERROR",
      msg: "client_id not found"
    });
  else
    res.jsonp({
      status: "OK",
      clientId: _clientId,
      redirectUrl: _redirectUrl,
      authApiUrl: _authApiUrl,
      attributes: _attributes,
      authLevel: _authLevel
    });
});

// function for frontend to call backend
router.post('/getPersonData', function(req, res, next) {
  myConsole.log(myUtil.getmyfulldate() + " | === Executing getPersonData ===");

  // get variables from frontend
  var code = req.body.code;
  myConsole.log(myUtil.getmyfulldate() + " | Request Body Code : " + code);

  var data;
  var request;

  // **** CALL TOKEN API ****
  myConsole.log(myUtil.getmyfulldate() + " | calling createTokenRequest... ");
  
  request = createTokenRequest(code);
  
  try{
  request
    .buffer(true)
    .end(function(callErr, callRes) {
      if (callErr) {
        // ERROR
        console.error("Token Call Error: ",callErr.status);
        console.error(callErr.response.req.res.text);
        myConsole.log(myUtil.getmyfulldate() + "Error in CALL TOKEN API : " ,callErr.status);
        myConsole.log(myUtil.getmyfulldate() + callErr.response.req.res.text);
        res.jsonp({
          status: "ERROR",
          msg: callErr
        });
      } else {
        // SUCCESSFUL
        var data = {
          body: callRes.body,
          text: callRes.text
        };
        console.log("Response from Token API:".green);
        console.log(JSON.stringify(data.body));
        myConsole.log(myUtil.getmyfulldate() + " | Response from Token API :");
        myConsole.log(myUtil.getmyfulldate() + JSON.stringify(data.body));

        var accessToken = data.body.access_token;
        if (accessToken == undefined || accessToken == null) {
          myConsole.log(myUtil.getmyfulldate() + " | ACCESS TOKEN NOT FOUND !!");
          res.jsonp({
            status: "ERROR",
            msg: "ACCESS TOKEN NOT FOUND"
          });
        }
        myConsole.log(myUtil.getmyfulldate() + " | ACCESS TOKEN : ");
        myConsole.log(accessToken);

        // everything ok, call person API
        callPersonAPI(accessToken, res);
      }
      myConsole.log(myUtil.getmyfulldate() + " | Finish Create Token Request");
    });
  }
  catch(error){
    myConsole.log(error);
  }
  myConsole.log(myUtil.getmyfulldate() + " | Finish Get Person Data");
});

function callPersonAPI(accessToken, res) {
  myConsole.log(myUtil.getmyfulldate() + " | === Executing callPersonAPI ===");
  console.log("AUTH_LEVEL:".green,_authLevel);

  // validate and decode token to get SUB
  var decoded = securityHelper.verifyJWS(accessToken, _publicCertContent);
  if (decoded == undefined || decoded == null) {
	myConsole.log(myUtil.getmyfulldate() + " | INVALID TOKEN");
    res.jsonp({
      status: "ERROR",
      msg: "INVALID TOKEN"
    })
  }

  console.log("Decoded Access Token:".green);
  console.log(JSON.stringify(decoded));
  myConsole.log(myUtil.getmyfulldate() + "Decode Access Token : ");
	myConsole.log(myUtil.getmyfulldate() + decoded);
	
  var sub = decoded.sub;
  if (sub == undefined || sub == null) {
	  myConsole.log(myUtil.getmyfulldate() + "SUB NOT FOUND");
    res.jsonp({
      status: "ERROR",
      msg: "SUB NOT FOUND"
    });
  }

  // **** CALL PERSON API ****
  var request = createPersonRequest(sub, accessToken);

  // Invoke asynchronous call
  request
    .buffer(true)
    .end(function(callErr, callRes) {
      if (callErr) {
        console.error("Person Call Error: ",callErr.status);
        console.error(callErr.response.req.res.text);
        res.jsonp({
          status: "ERROR",
          msg: callErr
        });
      } else {
        // SUCCESSFUL
        var data = {
          body: callRes.body,
          text: callRes.text
        };
        var personData = data.text;
        if (personData == undefined || personData == null) {
          res.jsonp({
            status: "ERROR",
            msg: "PERSON DATA NOT FOUND"
          });
        } else {

          if (_authLevel == "L0") {
            console.log("Person Data:".green);
            console.log(personData);
            personData = JSON.parse(personData);
            // personData = securityHelper.verifyJWS(personData, _publicCertContent);

            if (personData == undefined || personData == null) {
              res.jsonp({
                status: "ERROR",
                msg: "INVALID DATA OR SIGNATURE FOR PERSON DATA"
              });
            }
            
            // successful. return data back to frontend
            res.jsonp({
              status: "OK",
              text: personData
            });

          }
          else if(_authLevel == "L2"){
            console.log("Person Data (JWE):".green);
            console.log(personData);

            var jweParts = personData.split("."); // header.encryptedKey.iv.ciphertext.tag
            securityHelper.decryptJWE(jweParts[0], jweParts[1], jweParts[2], jweParts[3], jweParts[4], _privateKeyContent)
              .then(personDataJWS => {
                if (personDataJWS == undefined || personDataJWS == null) {
                  res.jsonp({
                    status: "ERROR",
                    msg: "INVALID DATA OR SIGNATURE FOR PERSON DATA"
                  });
                }
                console.log("Person Data (JWS):".green);
                console.log(JSON.stringify(personDataJWS));

                var decodedPersonData = securityHelper.verifyJWS(personDataJWS, _publicCertContent);
                if (decodedPersonData == undefined || decodedPersonData == null) {
                  res.jsonp({
                    status: "ERROR",
                    msg: "INVALID DATA OR SIGNATURE FOR PERSON DATA"
                  })
                }


                console.log("Person Data (Decoded):".green);
                console.log(JSON.stringify(decodedPersonData));
                // successful. return data back to frontend
                res.jsonp({
                  status: "OK",
                  text: decodedPersonData
                });

              })
              .catch(error => {
                console.error("Error with decrypting JWE: %s".red, error);
              })
          }
          else {
            throw new Error("Unknown Auth Level");
          }

        } // end else
      }
    }); //end asynchronous call
}

// function to prepare request for TOKEN API
function createTokenRequest(code) {
  myConsole.log(myUtil.getmyfulldate() + " | === Executing createTokenRequest ===");
  var cacheCtl = "no-cache";
  var contentType = "application/x-www-form-urlencoded";
  var accept = "application/json";
  var method = "POST";

  // assemble params for Token API
  var strParams = "grant_type=authorization_code" +
    "&code=" + code +
    "&redirect_uri=" + _redirectUrl +
    "&client_id=" + _clientId +
    "&client_secret=" + _clientSecret;
  var params = querystring.parse(strParams);


  // assemble headers for Token API
  var strHeaders = "Accept=" + accept + "&Content-Type=" + contentType + "&Cache-Control=" + cacheCtl;
  var headers = querystring.parse(strHeaders);

  // Add Authorisation headers for connecting to API Gateway
  var authHeaders = null;
  if (_authLevel == "L0") {
    // No headers
  } else if (_authLevel == "L2") {
    authHeaders = securityHelper.generateAuthorizationHeader(
      _tokenApiUrl,
      params,
      method,
      contentType,
      _authLevel,
      _clientId,
      _privateKeyContent,
      _clientSecret
    );
  } else {
    throw new Error("Unknown Auth Level");
  }

  if (!_.isEmpty(authHeaders)) {
    _.set(headers, "Authorization", authHeaders);
  }

  console.log("Request Header for Token API:".green);
  console.log(JSON.stringify(headers));

  myConsole.log(myUtil.getmyfulldate() + " | Request Header for Token API:");
  myConsole.log(JSON.stringify(headers));
	
  myConsole.log(myUtil.getmyfulldate() + " | calling --> restClient.post(" +  _tokenApiUrl + ")");
  try{
    var request = restClient.post(_tokenApiUrl);
  }  catch(error){
    myConsole.log(myUtil.getmyfulldate() + " | Error in restClient.post: " +  error);
  }

  myConsole.log(myUtil.getmyfulldate() + " | Set headers");
  try{ 
    // Set headers
    if (!_.isUndefined(headers) && !_.isEmpty(headers)){
      myConsole.log(myUtil.getmyfulldate() + " | calling --> request.set(headers)"); 
      myConsole.log(headers);
      request.set(headers);    
    }
    else{
      myConsole.log(myUtil.getmyfulldate() + " | headers is undefined or empty");
    }
	}catch(error){
      myConsole.log(myUtil.getmyfulldate() + " | Error in Set headers: " +  error);
  }

  myConsole.log(myUtil.getmyfulldate() + " | Set Params");
  // Set Params
  try{ 
    if (!_.isUndefined(params) && !_.isEmpty(params)){
      myConsole.log(myUtil.getmyfulldate() + " | calling --> request.send(params)");
      myConsole.log(params);
      request.send(params);      
    }
    else{
      myConsole.log(myUtil.getmyfulldate() + " | params is undefined or empty");
    }
  }catch(error){
    myConsole.log(myUtil.getmyfulldate() + " | Error in Set Params: " +  error);
  }

  myConsole.log(myUtil.getmyfulldate() + " | return request:");
  myConsole.log(request);
  return request;
}

// function to prepare request for PERSON API
function createPersonRequest(sub, validToken) {
  var url = _personApiUrl + "/" + sub + "/";
  var cacheCtl = "no-cache";
  var method = "GET";

  // assemble params for Person API
  var strParams = "client_id=" + _clientId +
    "&attributes=" + _attributes;

  var params = querystring.parse(strParams);

  // assemble headers for Person API
  var strHeaders = "Cache-Control=" + cacheCtl;
  var headers = querystring.parse(strHeaders);

  // Add Authorisation headers for connecting to API Gateway
  var authHeaders = securityHelper.generateAuthorizationHeader(
    url,
    params,
    method,
    "", // no content type needed for GET
    _authLevel,
    _clientId,
    _privateKeyContent,
    _clientSecret
  );

  // NOTE: include access token in Authorization header as "Bearer " (with space behind)
  if (!_.isEmpty(authHeaders)) {
    _.set(headers, "Authorization", authHeaders + ",Bearer " + validToken);
  } else {
    _.set(headers, "Authorization", "Bearer " + validToken);
  }

  console.log("Request Header for Person API:".green);
  console.log(JSON.stringify(headers));

  myConsole.log(myUtil.getmyfulldate() + " | Request Header for Person API:");
  myConsole.log(JSON.stringify(headers));
	
  // invoke person API
	myConsole.log(myUtil.getmyfulldate() + " | invoke person API --> restClient.get(" + url + ")");
  var request = restClient.get(url);

  // Set headers
  if (!_.isUndefined(headers) && !_.isEmpty(headers)){
	  myConsole.log(myUtil.getmyfulldate() + " | Set headers --> request.set(" + headers + ")");
    request.set(headers);
  }
	else{
		myConsole.log(myUtil.getmyfulldate() + " | headers is undefined or empty");
	}
	
  // Set Params
  if (!_.isUndefined(params) && !_.isEmpty(params)){
	  myConsole.log(myUtil.getmyfulldate() + " | Set params --> request.query(" + params + ")");
    request.query(params);
   }
	else{
		myConsole.log(myUtil.getmyfulldate() + " | params is undefined or empty");
	}

  return request;
}

module.exports = router;
