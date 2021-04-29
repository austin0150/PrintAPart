require("firebase/auth");
const firebase = require('firebase')
const admin = require('firebase-admin')
const serviceAccount = require("{Keyfile}");
var firebaseConfig = {
    apiKey: "{APIKEY}",
  authDomain: "printapart.firebaseapp.com",
  databaseURL: "https://printapart.firebaseio.com",
  projectId: "printapart",
  storageBucket: "printapart.appspot.com",
  messagingSenderId: "999999999999",
  appId: "1:999999999999:web:abcdef999999999999f",
  measurementId: "G-ZZZZZZZZZ"

};firebase.initializeApp(firebaseConfig);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://printapart.firebaseio.com"
});module.exports = { firebase, admin };