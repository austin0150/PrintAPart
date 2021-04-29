const paypal = require('@paypal/payouts-sdk');

let clientId = "{ClientID}";
let clientSecret = "{ClientSecret}";

const httpHelper = require('./http_helper');

exports.GetOnBoardingLink = async function() {
  var link = await httpHelper.PostPartnerReferral(clientId,clientSecret);
  return link;
}
