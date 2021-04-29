const fetch = require("node-fetch");


exports.GetCoordinates = async function (zipCode){
    const url = "https://api.mapbox.com/geocoding/v5/mapbox.places/" + zipCode +".json?access_token={token}";
    try {
        const response = await fetch(url);
        const json = await response.json();
        return json.features[0];

    } catch (error) {
        console.log(error);
    }
}
