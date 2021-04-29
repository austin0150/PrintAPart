//Delete a file

const {Storage} = require('@google-cloud/storage');

// Creates a client

const storage = new Storage({keyFilename: './scripts/keyfile.json'});
const bucket = storage.bucket('printapart.appspot.com');

//Record Transaction Details
exports.Delete3DFile = async function(fileUrl,uid)
{
    var prefix = "3d_models/"+ uid +"/";

    var files = await bucket.getFiles({prefix:prefix});

    var foundFile;

    files.forEach((file) =>{

        console.log(file);
    });


    console.log(files);
}