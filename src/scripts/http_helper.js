const https = require('https')
const axios = require('axios');
const { exception } = require('console');


exports.PostBearerToken = async function (url, clientId, clientSecret)
{
  var encodedData = Buffer.from(clientId + ':' + clientSecret).toString('base64');
    var authorizationHeaderString = 'Basic ' + encodedData;

  // send a POST request
  var response = await axios({
    method: 'post',
    url: url,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization' : authorizationHeaderString
    },
    data: {
    }
  });

  if(response.status == 200)
  {
    return response.data.access_token;
  }
  else{
    throw exception("Bad response from PayPal Token call " + response.data.status);
  }

}

exports.PostPartnerReferral = async function (clientId,clientSecret){

  var bearerToken = await this.PostBearerToken('https://api-m.sandbox.paypal.com/v1/oauth2/token?grant_type=client_credentials',clientId,clientSecret)
  bearerToken = "Bearer " + bearerToken;

  var requestData = {
    operations: [
      {
        operation: "API_INTEGRATION",
        api_integration_preference: {
          rest_api_integration: {
            integration_method: "PAYPAL",
            integration_type: "THIRD_PARTY",
            third_party_details: {
              features: [
                "PAYMENT",
                "REFUND"
             ]
            }
          }
        }
      }
    ],
    products: [
      "EXPRESS_CHECKOUT"
    ],
    legal_consents: [
      {
        type: "SHARE_DATA_CONSENT",
        granted: true
      }
    ]
  };

  try{
    var actionLink;
    var response = await axios({
      method: 'post',
      url: 'https://api-m.sandbox.paypal.com/v2/customer/partner-referrals',
      headers: {
        'Content-Type': 'application/json',
        'Authorization' : bearerToken
      },
      data: requestData
    });

    links = response.data.links;
    links.forEach(link => {
      if(link.rel == 'action_url'){
        actionLink = link.href;
      }
    });

    return actionLink;
  }
  catch (error)
  {
    console.log(error);
    throw exception("Bad response from PayPal partner referral call " + response.data.status);
  }

}
