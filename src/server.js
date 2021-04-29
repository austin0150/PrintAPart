// load the things we need
var express = require('express');

var app = express();
var firestore = require('./scripts/firestore_actions');
var storage = require('./scripts/storage_actions');
var maps = require('./scripts/geocoding_actions');
var helper = require('./scripts/helper_functions');
var paypal = require('./scripts/paypal_actions');
var http = require('./scripts/http_helper');


const { firebase, admin } = require('./fbConfig')

var bodyParser = require('body-parser');

var cookieParser = require('cookie-parser');
app.use(cookieParser());

// for parsing application/json
app.use(bodyParser.json({limit: "50mb"})); 

// for parsing application/xwww-
app.use(bodyParser.urlencoded({ extended: true, limit:"50mb" })); 
//form-urlencoded

app.use(express.static("public"));

// set the view engine to ejs
app.set('view engine', 'ejs');

//Route used for authenticating the user
app.post('/login_auth',function(req,res){
    firebase.auth().signInWithEmailAndPassword(req.body.email, req.body.password)
    .then(function () {
     firebase.auth().currentUser.getIdToken(true).then(function(idToken){
            res.send(idToken)
            res.end()
         }).catch(function (error) {
        console.log(error);
    });
    }).catch(function (error) {
        res.status(500);
        res.send();
        res.send();
    });

});

// index page
app.get('/',authValidate, async (req,res)=>{
    //Logged in
    var user;
    var uid;
    var roles = [];
    var loggedIn;
    var communities = await firestore.GetCommunities();
    var commIDs = [];
    var posts = [];


    if(res.locals.uid != undefined)
    {
        var userDoc = await firestore.GetUserProfile(res.locals.uid);
        user = userDoc.data();
        uid = userDoc.id;
        loggedIn = true;
        roles = user.Roles;

        var favoritedCommunities = await firestore.GetFavoritedCommunities(uid);
        favoritedCommunities.forEach(favoritedCommunities =>{
            commIDs.push(favoritedCommunities.id)
        })
        
    }
    else{
        loggedIn = false;
        user = {};
    }

    if(commIDs.length < 1){
        var commData = await firestore.GetCommunities()
        commData.forEach(doc => {
            commIDs.push(doc.id);
          });
    }

    
    posts = await firestore.GetPostsFromCommunities(commIDs)

    res.render('pages/index',{user:user,communities:communities,loggedIn:loggedIn,roles:roles,uid:uid,posts:posts,viewFlagged:false});
    
    });

app.get('/error',function(req,res){
    var error = req.query['errorCode'];

    res.render('pages/error',{
        errorCode:error
    });
});

// about page
app.get('/about', authValidate, async function(req, res) {
    var loggedIn;
    var roles = [];
    var uid;
    if(res.locals.uid != undefined)
    {
        var userDoc = await firestore.GetUserProfile(res.locals.uid);
        user = userDoc.data();
        uid = userDoc.id;
        loggedIn = true;
        roles = user.Roles;
    }
    else
    {
        loggedIn = false;
    }

    res.render('pages/about',{loggedIn:loggedIn,roles:roles,uid:uid});
});

app.get('/printer_map', authValidate, async function (req,res){
    var loggedIn;
    var roles = [];
    var uid;
    var user ={};
    if(res.locals.uid != undefined)
    {
        var userDoc = await firestore.GetUserProfile(res.locals.uid);
        user = userDoc.data();
        uid = userDoc.id;
        loggedIn = true;
        roles = user.Roles;
    }
    else
    {
        loggedIn = false;
    }

    var printerZipDocs = await firestore.GetZipDocuments();

    res.render('pages/maps',{loggedIn:loggedIn,roles:roles,uid:uid,user:user,zipDocs:printerZipDocs});
});

// login page
app.get('/login', function(req, res) {
    var roles =[];
    var user = {};
    var uid = '';

    res.render('pages/login',{loggedIn:false,roles:roles,user:user, uid:uid});
});

app.get('/logout',authValidate, function(req,res){
    roles = [];
    if(res.locals.uid != undefined)
    {
        res.render('pages/logout',{loggedIn:false,roles:roles,uid:''});
    }
    else{
        res.render('pages/unauthorized',{loggedIn:false,roles:roles,uid:''});
    }
    
});

app.get('/signup', function(req,res){
    var roles=[];
    res.render('pages/signup',{loggedIn:false,roles:roles,uid:''});

});

app.get('/forgot_pass', function(req,res){
    roles=[];
    res.render('pages/forgotPass',{loggedIn:false,roles:roles,uid:''});
});

app.post('/add_auth',function(req,res){

    var email;
    var password;
    if(req.body.email != undefined && req.body.password != undefined)
    {
        email = req.body.email;
        password = req.body.password;
    }

    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
        // Signed in 
        var user = userCredential.user;
        res.send(user);
        res.end();
        
    })
    .catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.message;

        res.status(500);
        res.send(errorCode);
        res.end();
    });
});

app.get('/new_user',function(req,res){
    var email = req.query['email'];
    var uid = req.query['uid'];

    var roles = [];
    
    if(!(uid) || !(email)){
        res.redirect('/unauthorized');
        return;
    }
    

    res.render('pages/create_user',{
        uid:uid,
        email:email,
        loggedIn:false,
        roles:roles
    });
});

app.post('/add_post_signup', async function(req,res){
    var email = req.body.email;
    var uid = req.body.uid;

    var roles = [];

    var user = { email:email,Roles:roles,SetupComplete:false};

    await firestore.AddUser(uid,user);

    res.send();
    res.end();
});

app.post('/add_user',async function(req,res){
    var formData = req.body;
    console.log(formData);

    var uid = formData.uid;
    var user = {
        FirstName:formData.FirstName,
        LastName:formData.LastName,
        ZipCode:formData.ZipCode,
        Roles:["Blogger","Requester"],
        email:formData.email,
        userName:formData.userName,
        profileImage:formData.ImageLink,
        SetupComplete:true
    };

    var userNameObj = {
        uid:uid
    };
    

    await firestore.AddUser(uid,user);

    // Send email to alert Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "A new user has been added",
    //     html: "A new user (" + user.userName + ") has been created."
    // }
    // await firestore.SendEmail(message, sendTo);

    // Send email to alert to new user
    // var sendTo = user.email;
    // var message = {
    //     subject: "Welcome to the PrintAPart community!",
    //     html: "Thank you for joining PrintAPart! Your account has successfully been created."
    // }
    // await firestore.SendEmail(message, sendTo);

    res.redirect('/login');
});

// requester page
app.get('/new_request',authValidate, async function(req, res) {
    roles =[];
    var loggedIn;
    var uid;
    var user;
    if(res.locals.uid != undefined)
    {
        var userDoc = await firestore.GetUserProfile(res.locals.uid);
        user = userDoc.data();
        uid = userDoc.id;
        loggedIn = true;
        roles = user.Roles;
        if(!(roles.includes('Requester'))){
            res.redirect('unauthorized');
            return;
        }
    }
    else
    {
        uid = '';
        loggedIn = false;
        res.redirect('login');
        return;
    }

    res.render('pages/new_request',{loggedIn:loggedIn,roles:roles,user:user,uid:uid});
});

// printer (requests) page
app.get('/view_requests', authValidate, async function(req,res){
    roles =[];
    var loggedIn;
    var user;
    var uid;

    if(res.locals.uid != undefined)
    {
        var userDoc = await firestore.GetUserProfile(res.locals.uid);
        user = userDoc.data();
        uid = userDoc.id;
        loggedIn = true;
        roles = user.Roles;
        if(!(roles.includes('Printer') || roles.includes('Admin'))){
            res.redirect('unauthorized')
            res.end();
            return;
        }
    }
    else
    {
        res.redirect('/login');
        res.end();
        return;

    }
    var statusNumber = req.query["StatusNumber"];

    //Set status number if one was not sent
    if(statusNumber == undefined){
        statusNumber = "2";
    }

    //Set status 2 because they must be a printer
    if(!roles.includes("Admin")){
        statusNumber = "2";
    }

    var requests = await firestore.GetRequestsByStatus(statusNumber);

      res.render('pages/requests', {
        requests : requests,
        loggedIn:loggedIn,
        roles:roles,
        user:user,
        uid:uid,
        StatusNumber:statusNumber
    });
});

// Unauthorized page
app.get('/unauthorized', authValidate, async function(req,res){
    roles =[];
    var loggedIn;
    var user;
    var uid;
    if(res.locals.uid != undefined)
    {
        var userDoc = await firestore.GetUserProfile(res.locals.uid);
        user = userDoc.data();
        uid = userDoc.id;
        loggedIn = true;
        roles = user.Roles;
    }
    else
    {
        res.redirect('/login')
    }

      res.render('pages/unauthorized', {
        loggedIn:loggedIn,
        roles:roles,
        user:user,
        uid:uid
    });
});

//communities page
app.get('/communities',authValidate, async function(req,res){

    var roles = [];
    var loggedIn;
    var user;
    var uid;
    if(res.locals.uid != undefined)
    {
        var userDoc = await firestore.GetUserProfile(res.locals.uid);
        user = userDoc.data();
        uid = userDoc.id;
        loggedIn = true;
        roles = user.Roles;
    }
    else
    {
        loggedIn = false;
    }

    var communities = await firestore.GetCommunities();

      res.render('pages/communities', {
        communities : communities,
        loggedIn:loggedIn,
        roles:roles,
        user:user,
        uid:uid
    });
});

app.post('/search_communities',authValidate, async function (req,res){
    var roles = [];
    var loggedIn;
    var user;
    var uid;
    if(res.locals.uid != undefined)
    {
        var userDoc = await firestore.GetUserProfile(res.locals.uid);
        user = userDoc.data();
        uid = userDoc.id;
        loggedIn = true;
        roles = user.Roles;
    }
    else
    {
        loggedIn = false;
    }

    var communities;

    if(req.body.communitySearch == '')
    {
        communities = await firestore.GetCommunities();
    }
    else{
        communities = await firestore.SearchCommunity(req.body.communitySearch);
    }

    

      res.render('pages/communities', {
        communities : communities,
        loggedIn:loggedIn,
        roles:roles,
        user:user,
        uid:uid
    });
});

//Community Feed page
app.get('/community_feed',authValidate, async function(req,res){

    var roles = [];
    var loggedIn;
    var user;
    var uid;
    var favoritedCommunities = [];
    var isFavorited = false;
    var commId = req.query['commId'];

    if(res.locals.uid != undefined)
    {
        var userDoc = await firestore.GetUserProfile(res.locals.uid);
        user = userDoc.data();
        uid = userDoc.id;
        loggedIn = true;
        roles = user.Roles;
        var favoritedCommunities = await firestore.GetFavoritedCommunities(uid);
        favoritedCommunities.forEach(doc => {
            if(doc.id == commId){
                isFavorited = true;
            };
          });
    }
    else
    {
        loggedIn = false;
    }
    var view_flagged = req.query["Flagged"];
    if(view_flagged == "true") {
        view_flagged = true;
    } else if(view_flagged == "false") {
        view_flagged = false;
    } else {
        // If any other parameter was sent, or nothing was sent, set view_flagged to false
        view_flagged = false;
    }

    //Set view_flagged to false if they are not an Admin
    if(!roles.includes("Admin")){
        view_flagged = false;
    }

    var posts = await firestore.GetPostsFromCommunity(commId, view_flagged);
    var communityData = await firestore.GetCommunity(commId);
    var tags = await firestore.GetTags(commId);

    res.render('pages/community_feed', {
        posts : posts,
        communityData : communityData,
        commId : commId,
        loggedIn:loggedIn,
        roles:roles,
        user:user,
        uid:uid,
        isFavorited: isFavorited,
        viewFlagged : view_flagged,
        tags:tags
    });
});

//Blog post and comments page
app.get('/blog_post',authValidate, async function(req,res){

    var roles = [];
    var loggedIn;
    var uid;
    var likedCommentIds = [];
    var user;
    if(res.locals.uid != undefined)
    {
        var userDoc = await firestore.GetUserProfile(res.locals.uid);
        user = userDoc.data();
        uid = userDoc.id;
        loggedIn = true;
        roles = user.Roles;
        likedComments = await firestore.GetUserLikedComments(uid);
        for (i = 0; i < likedComments.length; i++) {
            likedCommentIds.push(likedComments[i].id);
        }
    }
    else
    {
        loggedIn = false;
        uid = null;
        user = {};
    }

    var commId = req.query['commId'];
    var postId = req.query['postId'];
    var filter = req.query["filter"];
    if((filter != "oldest") & (filter != "newest") & (filter != "7")) {
        filter = "newest"
    } 
    
    var blogPostData = await firestore.GetBlogPost(commId, postId);
    var comments = await firestore.GetCommentsFromBlogPost(commId, postId, filter);
    var likes = await firestore.GetLikesFromBlogPost(commId, postId);

    var likeIds = [];
    
    for (i = 0; i < likes.length; i++) {
        likeIds.push(likes[i].id);
    }
    
    res.render('pages/post', {
        postId : postId,
        commId : commId,
        blogPostData : blogPostData,
        comments : comments,
        likes : likes,
        loggedIn:loggedIn,
        roles:roles,
        uid:uid,
        user:user,
        likeIds:likeIds,
        likedCommentIds : likedCommentIds,
        filter:filter
    });
});

app.post('/blog_post',authValidate, async function(req,res){

    var roles = [];
    var loggedIn;
    var uid;
    var user;
    var likedCommentIds = [];
    if(res.locals.uid != undefined)
    {
        var userDoc = await firestore.GetUserProfile(res.locals.uid);
        user = userDoc.data();
        uid = userDoc.id;
        loggedIn = true;
        roles = user.Roles;
        likedComments = await firestore.GetUserLikedComments(uid);
        for (i = 0; i < likedComments.length; i++) {
            likedCommentIds.push(likedComments[i].id);
        }
    }
    else
    {
        loggedIn = false;
        uid = null;
        user = {};
        uid = '';
    }

    var commId = req.query['commId'];
    var postId = req.query['postId'];
    var filter = req.query["filter"];
    if((filter != "oldest") & (filter != "newest") & (filter != "7")) {
        filter = "newest"
    } 

    var blogPostData = await firestore.GetBlogPost(commId, postId);
    var comments = await firestore.GetCommentsFromBlogPost(commId, postId, filter);
    var likes = await firestore.GetLikesFromBlogPost(commId, postId);

    var likeIds = [];
    
    for (i = 0; i < likes.length; i++) {
        likeIds.push(likes[i].id);
    }
    
    res.render('pages/post', {
        postId : postId,
        commId : commId,
        blogPostData : blogPostData,
        comments : comments,
        likes : likes,
        loggedIn:loggedIn,
        roles:roles,
        uid : uid,
        likeIds : likeIds,
        likedCommentIds : likedCommentIds,
        user:user,
        filter:filter
    });
});

//Create Post page
app.get('/create_post',authValidate, async function(req,res){

    var roles = [];
    var loggedIn;
    var user;
    if(res.locals.uid != undefined)
    {
        var userDoc = await firestore.GetUserProfile(res.locals.uid);
        user = userDoc.data();
        uid = userDoc.id;
        loggedIn = true;
        roles = user.Roles;
        if(!(roles.includes('Blogger'))){
            res.redirect('unauthorized')
            res.end();
            return;
        }
    }
    else
    {
        res.redirect('/login');
        res.end();
        return;
    }

    var communityId = req.query['communityId'];

    // If communityId not valid, then redirect user to the communities page
    if (!communityId){
        res.redirect('/communities');
        return;
    } else {
        var comm = await firestore.GetCommunity(communityId);

        res.render('pages/create_post', {
            community : comm,
            communityId: communityId,
            loggedIn:loggedIn,
            roles:roles,
            uid:uid,
            user:user
        });
    }
});

//Add post to firestore
app.post('/add_post',authValidate, async function(req,res){

    var roles = [];
    var loggedIn;
    if(res.locals.uid != undefined)
    {
        user = (await firestore.GetUserProfile(res.locals.uid)).data();
        loggedIn = true;
        roles = user.Roles;
    }
    else
    {
        res.status(401);
        res.send();
        res.end();
        return;
    }

    var date = new Date();
    req.body.postData.reviewDate = date;
    req.body.postData.accessible = true;
    req.body.postData.flagged = false;
    
    var result = await firestore.AddPost(req.body.postData);
    await firestore.AddTags(req.body.postData.tags, req.body.postData.community);

    // Send email to alert Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var communityData = await firestore.GetCommunity(req.body.postData.community)
    // var message = {
    //     subject: "A new blog post has been made",
    //     html: "Blogger (" + req.body.postData.userName + ") has made a new blog post in the " + communityData.name + "community."
    // }
    // await firestore.SendEmail(message, sendTo);

    res.send();
    res.end();


});

//Flag post with note
app.post('/flag_post',authValidate, async function(req,res){
    var loggedIn;
    var roles = [];

    if(res.locals.uid == undefined){
        res.redirect('/login')
    }

    var userDoc = await firestore.GetUserProfile(res.locals.uid);
    var user = userDoc.data();
    var uid = userDoc.id;
    loggedIn = true;
    roles = user.Roles;

    var commId = req.query['commId'];
    var postId = req.query['postId'];
    var date = new Date();
    req.body.commentDate = date;
    req.body.uid = uid;
    req.body.userName = user.userName;
    
    const post = (await firestore.FlagBlogPost(commId, postId, req.body)).data();

    // Send email to alert Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "A blog post has been flagged for review",
    //     html: "The following blog post, written by " + post.userName +", has been flagged for review:" + 
    //     "<br><i>"+ post.body_text +"</i>.<br><br>It was flagged by " + req.body.userName + " for the following reason:<br>" +
    //     "<i>"+ req.body.body_text +"</i>."
    // }
    // await firestore.SendEmail(message, sendTo);

    // Send email to alert Blogger
    // var bloggerData = (await firestore.GetUserProfile(post.user)).data();
    // var sendTo = bloggerData.email;
    // var message = {
    //     subject: "Your blog post has been flagged for review",
    //     html: "The following blog post has been flagged for review:" + 
    //     "<br><i>"+ post.body_text +"</i>."
    // }
    // await firestore.SendEmail(message, sendTo);

    res.redirect('/blog_post?commId='+commId+'&postId='+postId);
});

//Admin unflag blog post
app.post('/unflag_post',authValidate, async function(req,res){
    var roles = [];
    var loggedIn;
    if(res.locals.uid != undefined)
    {
        user = (await firestore.GetUserProfile(res.locals.uid)).data();
        loggedIn = true;
        roles = user.Roles;
        if(!roles.includes("Admin"))
        {
            res.status(401);
            res.send();
            res.end();
            return;
        }
    }
    else
    {
        res.status(401);
        res.send();
        res.end();
        return;
    }
    var commId = req.body.commId;
    var postId = req.body.postId;

    var post = (await firestore.UnflagBlogPost(commId, postId)).data();

    // // Send email to alert Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "A blog post has been unflagged",
    //     html: "The following blog post, written by " + post.userName +", has been unflagged:" + 
    //     "<br><i>"+ post.body_text +"</i>."
    // }
    // await firestore.SendEmail(message, sendTo);

    // Send email to alert Blogger
    // var bloggerData = (await firestore.GetUserProfile(post.user)).data();
    // var sendTo = bloggerData.email;
    // var message = {
    //     subject: "Your blog post has been unflagged",
    //     html: "The following blog post has been unflagged:" + 
    //     "<br><i>"+ post.body_text +"</i>."
    // }
    // await firestore.SendEmail(message, sendTo);

    res.send();
    res.end();
});

//View the notes/comments from flagged posts
app.get('/blog_post_flagged_comments',authValidate, async function(req,res){
    var loggedIn;
    var roles = [];

    if(res.locals.uid == undefined){
        res.redirect('/login')
    }

    var userDoc = await firestore.GetUserProfile(res.locals.uid);
    var user = userDoc.data();
    var uid = userDoc.id;
    loggedIn = true;
    roles = user.Roles;

    if(!user.Roles.includes("Admin"))
    {
        res.redirect('/unauthorized');
    }

    var commId = req.query['commId'];
    var postId = req.query['postId'];

    var blogPostData = await firestore.GetBlogPost(commId, postId);
    var comments = await firestore.GetFlaggedNotesOfPosts(commId, postId);
    
    res.render('pages/flagged_blog_post', {
        postId : postId,
        commId : commId,
        blogPostData : blogPostData,
        comments : comments,
        loggedIn:loggedIn,
        roles:roles,
        uid : uid,
        user:user
    });
    

});

//Delete post 
app.post('/delete_post',authValidate, async function(req,res){

    var roles = [];
    var loggedIn;
    if(res.locals.uid != undefined)
    {
        user = (await firestore.GetUserProfile(res.locals.uid)).data();
        loggedIn = true;
        roles = user.Roles;
        if(!roles.includes("Admin"))
        {
            res.status(401);
            res.send();
            res.end();
            return;
        }
    }
    else
    {
        res.status(401);
        res.send();
        res.end();
        return;
    }
    var commId = req.body.commId;
    var postId = req.body.postId;

    const post = await firestore.DeleteBlogPost(commId, postId);
    
    // // Send email to alert Admin
    // const postData = post.data();
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "A blog post has been deleted",
    //     html: "The following blog post, written by " + postData.userName +", has been deleted:" + 
    //     "<br><i>"+ postData.body_text +"</i>."
    // }
    // await firestore.SendEmail(message, sendTo);

    // Send email to alert Blogger
    // var bloggerData = (await firestore.GetUserProfile(postData.user)).data();
    // var sendTo = bloggerData.email;
    // var message = {
    //     subject: "Your blog post has been deleted",
    //     html: "The following blog post has been deleted:" + 
    //     "<br><i>"+ postData.body_text +"</i>."
    // }
    // await firestore.SendEmail(message, sendTo);


    res.send();
    res.end();
});

//Add request to firestore
app.post('/add_request',authValidate, async function(req,res){
    var loggedIn;
    var roles = [];

    if(res.locals.uid == undefined){
        res.redirect('/login')
    }

    var userDoc = await firestore.GetUserProfile(res.locals.uid);
    var user = userDoc.data();
    var uid = userDoc.id;
    loggedIn = true;
    roles = user.Roles;

    if(!user.Roles.includes("Requester"))
    {
        res.status(401);
        res.end();
        return;
    }

    var date = new Date();
    req.body.uploadDate = date;
    req.body.adminApproved = false;
    req.body.adminRejected = false;
    req.body.claimed = false;
    req.body.printerApproved = false;
    req.body.StatusNumber = "1";

    req.body.userName = (user.FirstName + " " + user.LastName[0]);
    req.body.uid = res.locals.uid;
    
    var result = await firestore.AddRequest(req.body);

    // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "A new printing request has been made",
    //     html: "A new request was submitted by " + req.body.userName +":<br>" + 
    //     "<i>"+ req.body.message +"</i>."
    // }
    // await firestore.SendEmail(message, sendTo);

    // Send email alert to Requester
    // var requesterData = (await firestore.GetUserProfile(req.body.uid)).data();
    // var sendTo = requesterData.email;
    // var message = {
    //     subject: "Your printing request was successfully submitted",
    //     html: "Your printing request was successfully submitted:<br>" + 
    //     "Request message: <i>"+ req.body.message +"</i>."
    // }
    // await firestore.SendEmail(message, sendTo);

    res.send('');
    res.end();
});

//Add comment on blog post to firestore
app.post('/add_comment', authValidate, async function(req,res){
    var loggedIn;
    var roles = [];

    if(res.locals.uid == undefined){
        res.redirect('/login')
    }

    var user = await firestore.GetUserProfile(res.locals.uid);
    loggedIn = true;
    roles = user.data().Roles;

    if(!user.data().Roles.includes("Blogger"))
    {
        res.redirect('/unauthorized');
    }
    
    var commId = req.query['commId'];
    var postId = req.query['postId'];
    var filter = req.query['filter'];
    var date = new Date();
    req.body.commentDate = date;
    req.body.community = commId;
    req.body.postId = postId;
    req.body.replyTo = null;
    req.body.numReplies = 0;
    req.body.numLikes = 0;
    req.body.accessible = "yes";
    req.body.uid = res.locals.uid;
    req.body.userName = (user.data().FirstName + " " + user.data().LastName[0]);
    req.body.FirstName = user.data().FirstName;
    req.body.LastName = user.data().LastName;

    if((filter != "oldest") & (filter != "newest") & (filter != "7")) {
        filter = "newest"
    } 
    
    var result = await firestore.AddComment(req.body);

    res.redirect('/blog_post?commId='+commId+'&postId='+postId+'&filter='+filter);
});

//Add reply on comment to firestore
app.post('/add_reply', authValidate, async function(req,res){
    if(res.locals.uid == undefined){
        res.redirect('/login')
    }

    var user = await firestore.GetUserProfile(res.locals.uid);
    loggedIn = true;
    roles = user.data().Roles;

    if(!user.data().Roles.includes("Blogger"))
    {
        res.redirect('/unauthorized');
    }
    var commId = req.query['commId'];
    var postId = req.query['postId'];
    var replyTo = req.query['replyTo'];
    var filter = req.query['filter'];
    var date = new Date();
    req.body.commentDate = date;
    req.body.community = commId;
    req.body.postId = postId;
    req.body.replyTo = replyTo;
    req.body.numReplies = 0;
    req.body.numLikes = 0;
    req.body.accessible = "yes";
    req.body.uid = res.locals.uid;
    req.body.userName = (user.data().FirstName + " " + user.data().LastName);
    req.body.FirstName = user.data().FirstName;
    req.body.LastName = user.data().LastName;

    if((filter != "oldest") & (filter != "newest") & (filter != "7")) {
        filter = "newest"
    } 
    
    var result = await firestore.AddComment(req.body);
    var replyCount = await firestore.AddToReplyCount(commId, postId, replyTo);

    res.redirect('/blog_post?commId='+commId+'&postId='+postId+'&filter='+filter);
});



//Single Request page
app.get('/request',authValidate, async function(req,res){

    var roles = [];
    var loggedIn;
    var user;
    var uid;
    if(res.locals.uid != undefined)
    {
        var userDoc = await firestore.GetUserProfile(res.locals.uid);
        user = userDoc.data();
        uid = userDoc.id;
        loggedIn = true;
        roles = user.Roles;
    }
    else
    {
        res.redirect('/login');
        return;
    }

    var requestId = req.query['requestId'];

    var requestData = await firestore.GetRequest(requestId);
    var comments = await firestore.GetCommentsFromRequest(requestId);
    var statusDesc = helper.GetStatusName(requestData.StatusNumber);
    var printerData;
    if(requestData.claimedBy)
    {
        printerData = (await firestore.GetUserProfile(requestData.claimedBy)).data();
    }
    
    var requesterData = (await firestore.GetUserProfile(requestData.uid)).data();

    if (!((res.locals.uid == requestData.uid) || (res.locals.uid == requestData.claimedBy) || roles.includes('Admin') || (roles.includes('Printer') && (requestData.StatusNumber == '2')) )) {
        res.redirect('/unauthorized');
        return;
    }

    res.render('pages/request', {
        requestData : requestData,
        requestId : requestId,
        loggedIn:loggedIn,
        roles:roles,
        uid:uid,
        comments:comments,
        user:user,
        statusDesc:statusDesc,
        printerData:printerData,
        requesterData:requesterData
    });
});

//Add comment on request to firestore
app.post('/add_comment_to_request', authValidate, async function(req,res){
    var loggedIn;
    var roles = [];

    if(res.locals.uid == undefined){
        res.redirect('/login')
    }

    var user = await firestore.GetUserProfile(res.locals.uid);
    loggedIn = true;
    roles = user.data().Roles;

    // if(!user.data().Roles.includes("Blogger"))
    // {
    //     res.redirect('/unauthorized');
    // }
    
    var requestId = req.query['requestId'];
    var date = new Date();
    req.body.commentDate = date;
    req.body.uid = res.locals.uid;
    req.body.userName = (user.data().FirstName + " " + user.data().LastName[0]);
    
    var result = await firestore.AddCommentToRequest(requestId, req.body);

    // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "New comment on request #" + requestId,
    //     html: "A new comment has been made by " + req.body.userName +" on request #" + requestId + ":<br>" + 
    //     "<i>"+ req.body.body_text +"</i>."
    // }
    // await firestore.SendEmail(message, sendTo);

    // Send email alert to Requester
    // var request = await firestore.GetRequest(requestId);
    // var requester = await firestore.GetUserProfile(request.uid).data();
    // var sendTo = requester.email;
    // var message = {
    //     subject: "New comment on your request",
    //     html: "A new comment has been made by " + req.body.userName +" on your request #" + requestId + ":<br>" + 
    //     "<i>"+ req.body.body_text +"</i>."
    // }
    // await firestore.SendEmail(message, sendTo);

    // Send email alert to the Printer that claimed the request
    // if(request.claimedBy)
    // {
    //     var printer = await firestore.GetUserProfile(request.claimedBy).data();
    //     var sendTo = printer.email;
    //     var message = {
    //         subject: "There's a new comment on a request that you've claimed",
    //         html: "A new comment has been made by " + req.body.userName +" on request #" + requestId + ", which you've claimed:<br>" + 
    //         "<i>"+ req.body.body_text +"</i>."
    //         }   
    //     await firestore.SendEmail(message, sendTo);
    // }

    res.redirect('/request?requestId='+requestId);
});

//Admin approve request
app.post('/approve_request', authValidate, async function(req,res){
    if(res.locals.uid == undefined){
        res.status(401);
        res.send();
        res.end();
        return;
    }

    var requestId = req.body.requestId;

    await firestore.ApproveRequest(requestId);

    var requestData = await firestore.GetRequest(requestId);

    var adminData = (await firestore.GetUserProfile(res.locals.uid)).data();

    var date = new Date();
    var commentObj = {
        commentDate : date,
        userName : "PrintAPart",
        body_text : "Admin ("+ adminData.userName +") approved request"
    }
    
    var addCommResult = await firestore.AddCommentToRequest(requestId, commentObj);

    // // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "Request #" + requestId + " has been approved",
    //     html: "Admin (" + adminData.userName + ") approved request #" + requestId + " made by " + requestData.userName+ "."
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to Requester
    // var requester = await firestore.GetUserProfile(requestData.uid).data();
    // var sendTo = requester.email;
    // var message = {
    //     subject: "Your request #" + requestId + " has been approved",
    //     html: "Admin (" + adminData.userName + ") approved your request #" + requestId
    // }
    // await firestore.SendEmail(message, sendTo);

    res.end();
});

//Printer approve request
app.post('/printer_approve_request', authValidate, async function(req,res){
    if(res.locals.uid == undefined){
        res.status(401);
        res.send();
        res.end();
        return;
    }

    var requestId = req.body.requestId;

    await firestore.PrinterApproveRequest(requestId);

    var requestData = await firestore.GetRequest(requestId);

    var printerData = (await firestore.GetUserProfile(requestData.claimedBy)).data();

    var date = new Date();
    var commentObj = {
        commentDate : date,
        userName : "PrintAPart",
        body_text : "Printer ("+ printerData.userName +") approved request for payment"
    }
    
    var addCommResult = await firestore.AddCommentToRequest(requestId, commentObj);

    // // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "Printer (" + printerData.userName + ") approved request #" + requestId,
    //     html: "Printer (" + printerData.userName + ") approved request #" + requestId
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to Requester
    // var requester = (await firestore.GetUserProfile(requestData.uid)).data();
    // var sendTo = requester.email;
    // var message = {
    //     subject: "Printer (" + printerData.userName + ") approved your request #" + requestId,
    //     html: "Printer (" + printerData.userName + ") approved your request #" + requestId
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to the Printer that approved the request
    // var sendTo = printerData.email;
    // var message = {
    //     subject: "You approved request #" + requestId,
    //     html: "You approved request # " + requestId +" which was made by " + requester.userName + ":<br>" + 
    //     "<i>"+ requestData.message +"</i>."
    //     }   
    // await firestore.SendEmail(message, sendTo);


    res.end();
});

// Admin deny request
app.post('/deny_request', authValidate, async function(req,res){
    if(res.locals.uid == undefined){
        res.status(401);
        res.send();
        res.end();
        return;
    }

    var requestId = req.body.requestId;

    await firestore.DenyRequest(requestId);

    var requestData = await firestore.GetRequest(requestId);

    var adminData = (await firestore.GetUserProfile(res.locals.uid)).data();

    var date = new Date();
    var commentObj = {
        commentDate : date,
        userName : "PrintAPart",
        body_text : "Admin ("+ adminData.userName +") denied request"
    }
    
    var addCommResult = await firestore.AddCommentToRequest(requestId, commentObj);

    // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "Request #" + requestId + " has been denied",
    //     html: "Admin (" + adminData.userName + ") denied request #" + requestId + " made by " + requestData.userName+ "."
    // }
    // await firestore.SendEmail(message, sendTo);

    // Send email alert to Requester
    // var requester = await firestore.GetUserProfile(requestData.uid).data();
    // var sendTo = requester.email;
    // var message = {
    //     subject: "Your request #" + requestId + " has been denied",
    //     html: "Admin (" + adminData.userName + ") denied your request #" + requestId + ":<br>" + 
    //     "<i>" + requestData.message + "</i>"
    // }
    // await firestore.SendEmail(message, sendTo);

    res.end();
});

// Printer drops request
app.post('/drop_request', authValidate, async function(req,res){
    if(res.locals.uid == undefined){
        res.status(401);
        res.send();
        res.end();
        return;
    }

    var requestId = req.body.requestId;
    var requestData = await firestore.GetRequest(requestId);
    var printerData = (await firestore.GetUserProfile(requestData.claimedBy)).data();

    await firestore.DropRequest(requestId);

    var date = new Date();
    var commentObj = {
        commentDate : date,
        userName : "PrintAPart",
        body_text : "Printer ("+ printerData.userName +") dropped request"
    }
    
    var addCommResult = await firestore.AddCommentToRequest(requestId, commentObj);

    // // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "Printer (" + printerData.userName + ") dropped request #" + requestId,
    //     html: "Printer (" + printerData.userName + ") dropped request #" + requestId
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to Requester
    // var requester = (await firestore.GetUserProfile(requestData.uid)).data();
    // var sendTo = requester.email;
    // var message = {
    //     subject: "Printer (" + printerData.userName + ") dropped your request #" + requestId,
    //     html: "Printer (" + printerData.userName + ") dropped your request #" + requestId + ":<br>" +
    //     "<i>" + requestData.message + "</i>"
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to the Printer that approved the request
    // var sendTo = printerData.email;
    // var message = {
    //     subject: "You dropped request #" + requestId,
    //     html: "You dropped request # " + requestId +" which was made by " + requester.userName + ":<br>" + 
    //     "<i>"+ requestData.message +"</i>."
    //     }   
    // await firestore.SendEmail(message, sendTo);

    res.end();
});

// Requester Cancels request
app.post('/cancel_request', authValidate, async function(req,res){
    if(res.locals.uid == undefined){
        res.status(401);
        res.send();
        res.end();
        return;
    }

    var requestId = req.body.requestId;

    await firestore.CancelRequest(requestId);

    var date = new Date();
    var commentObj = {
        commentDate : date,
        userName : "PrintAPart",
        body_text : "Requester cancelled request"
    }
    
    var addCommResult = await firestore.AddCommentToRequest(requestId, commentObj);

    
    // // Send email alert to Requester
    // var request = await firestore.GetRequest(requestId);
    // var requester = await firestore.GetUserProfile(request.uid).data();
    // var sendTo = requester.email;
    // var message = {
    //     subject: "You cancelled your request #" + requestId,
    //     html: "You cancelled your request # " + requestId  + ":<br>" + 
    //     "<i>"+ request.message +"</i>."
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "Requester " + requester.userName + " cancelled request #" + requestId,
    //     html: "Requester " + requester.userName + " cancelled request #" + requestId
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to the Printer that claimed the request (if any)
    // if(request.claimedBy)
    // {
    //     var printer = await firestore.GetUserProfile(request.claimedBy).data();
    //     var sendTo = printer.email;
    //     var message = {
    //         subject: "Requester " + requester.userName + " cancelled a request that you've claimed",
    //         html: "Requester " + requester.userName + " cancelled a request that you've claimed:<br>" + 
    //         "<i>"+ request.message +"</i>."
    //         }   
    //     await firestore.SendEmail(message, sendTo);
    // }

    res.end();
});

// Printer Completes request
app.post('/complete_request', authValidate, async function(req,res){
    if(res.locals.uid == undefined){
        res.status(401);
        res.send();
        res.end();
        return;
    }

    var requestId = req.body.requestId;

    await firestore.CompleteRequest(requestId);

    var requestData = await firestore.GetRequest(requestId);
    var printerData = (await firestore.GetUserProfile(requestData.claimedBy)).data();

    var date = new Date();
    var commentObj = {
        commentDate : date,
        userName : "PrintAPart",
        body_text : "Printer ("+ printerData.userName +")completed request"
    }
    
    var addCommResult = await firestore.AddCommentToRequest(requestId, commentObj);

    // // Send email alert to Requester
    // var requester = (await firestore.GetUserProfile(requestData.uid)).data();
    // var sendTo = requester.email;
    // var message = {
    //     subject: "Your request #" + requestId + " has been completed",
    //     html: "Your request # " + requestId  + " has been completed by " +printerData.userName
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "Printer (" + printerData.userName + ") completed request #" + requestId,
    //     html: "Printer (" + printerData.userName + ") completed request #" + requestId
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to the Printer that completed the request
    // var sendTo = printerData.email;
    // var message = {
    //     subject: "You've completed request #" + requestId,
    //     html:  "You've completed request #" + requestId +", which was made by " + requester.userName + "."
    //     }   
    // await firestore.SendEmail(message, sendTo);
    
    res.send("");
    res.end();
});

// Requester Disputes request
app.post('/dispute_request', authValidate, async function(req,res){
    if(res.locals.uid == undefined){
        res.status(401);
        res.send();
        res.end();
        return;
    }

    var requestId = req.body.requestId;

    await firestore.DisputeRequest(requestId);

    var requestData = await firestore.GetRequest(requestId);
    var requesterData = (await firestore.GetUserProfile(requestData.uid)).data();

    var date = new Date();
    var commentObj = {
        commentDate : date,
        userName : "PrintAPart",
        body_text : "Requester ("+ requesterData.userName +") disputed request status"
    }
    
    var addCommResult = await firestore.AddCommentToRequest(requestId, commentObj);

    // // Send email alert to Requester
    // var sendTo = requesterData.email;
    // var message = {
    //     subject: "You've disputed the request status of your request #" + requestId,
    //     html: "You've disputed the request status of your request #" + requestId + ":<br>" +
    //     "<i>" + requestData.message + "</i>"
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "Requester (" + requesterData.userName + ") disputed request #" + requestId,
    //     html: "Requester (" + requesterData.userName + ") disputed request #" + requestId
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to the Printer that claimed the request
    // if(requestData.claimedBy)
    // {
    //     var printer = (await firestore.GetUserProfile(request.claimedBy)).data();
    //     var sendTo = printer.email;
    //     var message = {
    //         subject: "Requester " + requester.userName + " disputed a request that you've claimed",
    //         html: "Requester " + requester.userName + " disputed a request that you've claimed:<br>" + 
    //         "<i>"+ requestData.message +"</i>."
    //         }   
    //     await firestore.SendEmail(message, sendTo);
    // }

    res.send("");
    res.end();
});

// Printer flags request
app.post('/flag_request', authValidate, async function(req,res){
    var loggedIn;
    var roles = [];

    if(res.locals.uid == undefined){
        res.redirect('/login')
    }

    var userDoc = await firestore.GetUserProfile(res.locals.uid);
    var user = userDoc.data();
    var uid = userDoc.id;
    loggedIn = true;
    roles = user.Roles;

    if(!user.Roles.includes("Printer"))
    {
        res.redirect('/unauthorized');
    }

    var requestId = req.query['requestId'];
    
    await firestore.FlagRequest(requestId);

    var date = new Date();
    var commentObj = {
        commentDate : date,
        userName : "PrintAPart",
        body_text : "Printer ("+ user.userName + ") flagged this request:<br>" + "<i>" + req.body.body_text + "</i>"
    }
    
    var addCommResult = await firestore.AddCommentToRequest(requestId, commentObj);

    // // Send email alert to Requester
    // var requestData = await firestore.GetRequest(requestId);
    // var requesterData = (await firestore.GetUserProfile(requestData.uid)).data();
    // var sendTo = requesterData.email;
    // var message = {
    //     subject: "Printer (" + user.userName + ") flagged your request #" + requestId,
    //     html: "Printer (" + user.userName + ") flagged your request #" + requestId + ".<br>Reason: " +
    //     "<i>" + req.body.body_text + "</i>"
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "Printer (" + user.userName + ") flagged request #" + requestId,
    //     html: "Printer (" + user.userName + ") flagged request #" + requestId + ".<br>Reason: " +
    //     "<i>" + req.body.body_text + "</i>"
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to the Printer that flagged the request
    // var sendTo = user.email;
    // var message = {
    //     subject: "You've flagged request #" + requestId,
    //     html: "You've flagged request #" + requestId + " made by " + requesterData.userName + " for the following reason:<br>" + 
    //     "<i>"+ req.body.body_text +"</i>."
    //     }   
    // await firestore.SendEmail(message, sendTo);
    

    res.redirect('/view_requests');
});

// Printer claims request
app.post('/claim_request', authValidate, async function(req,res){
    if(res.locals.uid == undefined){
        res.status(401);
        res.send();
        res.end();
        return;
    } 

    var requestId = req.body.requestId;
    var printerId = res.locals.uid;

    await firestore.ClaimRequest(requestId, printerId);

    var requestData = await firestore.GetRequest(requestId);
    var printerData = (await firestore.GetUserProfile(requestData.claimedBy)).data();

    var date = new Date();
    var commentObj = {
        commentDate : date,
        userName : "PrintAPart",
        body_text : "Printer ("+ printerData.userName +") claimed request"
    }
    
    var addCommResult = await firestore.AddCommentToRequest(requestId, commentObj);

    // // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "Printer (" + printerData.userName + ") claimed request #" + requestId,
    //     html: "Printer (" + printerData.userName + ") claimed request #" + requestId
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to Requester
    // var requester = (await firestore.GetUserProfile(requestData.uid)).data();
    // var sendTo = requester.email;
    // var message = {
    //     subject: "Printer (" + printerData.userName + ") claimed your request #" + requestId,
    //     html: "Printer (" + printerData.userName + ") claimed your request #" + requestId + ".<br>" +
    //     "Request message:<i>" + requestData.message + "</i>."
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to the Printer that claimed the request
    // var sendTo = printerData.email;
    // var message = {
    //     subject: "You claimed request #" + requestId,
    //     html: "You claimed request # " + requestId +" which was made by " + requester.userName + ".<br>" + 
    //     "Request message:<i>"+ requestData.message +"</i>."
    //     }   
    // await firestore.SendEmail(message, sendTo);

    res.end();
});

// My Claims page
app.get('/my_claims',authValidate, async function(req,res){
    if(res.locals.uid == undefined){
        res.redirect('/login');
        return;
    }
    
    var userDoc = await firestore.GetUserProfile(res.locals.uid);
    var user = userDoc.data();
    var uid = userDoc.id;
    var loggedIn = true;
    var roles = user.Roles;

    if(!roles.includes("Printer"))
    {
        res.redirect('/unauthorized');
        return;
    }

    var statusNumber = req.query["StatusNumber"];
    var statusList = ["3", "5", "6", "7", "8", "9"];
    //Set status number if one was not sent or if an invalid argument was sent
    if((statusNumber == undefined) || (!(statusList.includes(statusNumber)))){
        statusNumber = "3";
    }

    var requests = await firestore.GetPrintersClaimedRequests(uid, statusNumber);

    res.render('pages/my_claims', {
        requests:requests,
        loggedIn:loggedIn,
        roles:roles,
        uid:uid,
        user:user,
        StatusNumber: statusNumber
    });
});

// My Requests page
app.get('/my_requests',authValidate, async function(req,res){
    if(res.locals.uid == undefined){
        res.redirect('/login');
        return;
    }
    
    var userDoc = await firestore.GetUserProfile(res.locals.uid);
    var user = userDoc.data();
    var uid = userDoc.id;
    var loggedIn = true;
    var roles = user.Roles;

    if(!roles.includes("Requester"))
    {
        res.redirect('/unauthorized');
        return;
    }

    var statusNumber = req.query["StatusNumber"];
    var statusList = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    //Set status number if one was not sent or if an invalid argument was sent
    if((statusNumber == undefined) || (!(statusList.includes(statusNumber)))){
        statusNumber = "1";
    }
    
    if(statusNumber == "1" || statusNumber == "2"){
        var requests = await firestore.GetRequestsOfRequester(uid, ["1", "2"]);
    } else if(statusNumber == "3") {
        var requests = await firestore.GetRequestsOfRequester(uid, ["3"]);
    } else if(statusNumber == "5") {
        var requests = await firestore.GetRequestsOfRequester(uid, ["5"]);
    } else if(statusNumber == "6" || statusNumber == "7") {
        var requests = await firestore.GetRequestsOfRequester(uid, ["6", "7"]);
    } else if(statusNumber == "8") {
        var requests = await firestore.GetRequestsOfRequester(uid, ["8"]);
    } else if(statusNumber == "4" || statusNumber == "9") {
        var requests = await firestore.GetRequestsOfRequester(uid, ["4", "9"]);
    } 

    res.render('pages/my_requests', {
        requests:requests,
        loggedIn:loggedIn,
        roles:roles,
        uid:uid,
        user:user,
        StatusNumber: statusNumber
    });
});

// Add like to blog post
app.post('/add_like_to_post',authValidate, async (req,res)=>{
    if(res.locals.uid == undefined){
        res.status(401);
        res.send();
        res.end();
        return;
    }
    
    var likeObj = {};
    likeObj.uid = req.body.userUid;
    likeObj.commId = req.body.commId;
    likeObj.postId = req.body.postId;
    
    var result = await firestore.AddLikeToPost(likeObj);
    var likes = await firestore.GetLikesFromBlogPost(likeObj.commId, likeObj.postId)

    res.send({likes:likes});
    res.end();
    
});

// Remove like from blog post
app.post('/remove_like_from_post',authValidate, async (req,res)=>{
    if(res.locals.uid == undefined){
        res.status(401);
        res.send();
        res.end();
        return;
    }
    
    var commId = req.body.commId;
    var postId = req.body.postId;
    var likeId = req.body.uid;
    
    var result = await firestore.RemoveLikeFromPost(commId, postId, likeId);
    var likes = await firestore.GetLikesFromBlogPost(commId, postId);

    res.send({likes:likes});
    res.end();
    
});

// Add like to comment
app.post('/add_like_to_comment',authValidate, async (req,res)=>{
    if(res.locals.uid == undefined){
        res.status(401);
        res.send();
        res.end();
        return;
    }
    
    var likeObj = {};
    likeObj.uid = req.body.userUid;
    commId = req.body.commId;
    postId = req.body.postId;
    commentId = req.body.commentId;

    var commentLikeObj = {};
    commentLikeObj.commId = commId;
    commentLikeObj.postId = postId;
    commentLikeObj.commentId = commentId;
    
    var result = await firestore.AddLikeToComment(commId, postId, commentId, likeObj, commentLikeObj, req.body.userUid);
    var likes = await firestore.GetLikesFromComment(commId, postId, commentId)

    res.send({likes:likes});
    res.end();
    
});

// Remove like from comment
app.post('/remove_like_from_comment',authValidate, async (req,res)=>{
    if(res.locals.uid == undefined){
        res.status(401);
        res.send();
        res.end();
        return;
    }
    
    var commId = req.body.commId;
    var postId = req.body.postId;
    var likeId = req.body.uid;
    var commentId = req.body.commentId;
    
    var result = await firestore.RemoveLikeFromComment(commId, postId, commentId, likeId, req.body.uid);
    var likes = await firestore.GetLikesFromComment(commId, postId, commentId);

    res.send({likes:likes});
    res.end();
    
});

// Restrict comment
app.post('/restrict_comment',authValidate, async (req,res)=>{
    if(res.locals.uid == undefined){
        res.status(401);
        res.send();
        res.end();
        return;
    }

    var user = await firestore.GetUserProfile(res.locals.uid);

    if(!user.data().Roles.includes("Admin"))
    {
        res.redirect('/unauthorized');
    }
    
    var commId = req.body.commId;
    var postId = req.body.postId;
    var commentId = req.body.commentId;
    
    var result = await firestore.RestrictComment(commId, postId, commentId);

    // // Send email alert to Admin
    // var adminData = user.data();
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "Admin (" + adminData.userName + ") restricted comment #" + commentId + " made by " + result.userName,
    //     html: "Admin (" + adminData.userName + ") restricted comment #" + commentId + " made by " + result.userName+ ".<br>" +
    //     "Comment: " + "<i>" + result.body_text + "</i>"
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to Blogger
    // var blogger = (await firestore.GetUserProfile(result.uid)).data();
    // var sendTo = blogger.email;
    // var message = {
    //     subject: "Your comment has been restricted",
    //     html: "Your comment has been restricted.<br>" +
    //     "Comment: <i>" + result.body_text + "</i>."
    // }
    // await firestore.SendEmail(message, sendTo);

    res.send({result: result})
    res.end();
    
});

// Reveal comment
app.post('/reveal_comment',authValidate, async (req,res)=>{
    if(res.locals.uid == undefined){
        res.status(401);
        res.send();
        res.end();
        return;
    }

    var user = await firestore.GetUserProfile(res.locals.uid);

    if(!user.data().Roles.includes("Admin"))
    {
        res.redirect('/unauthorized');
    }
    
    var commId = req.body.commId;
    var postId = req.body.postId;
    var commentId = req.body.commentId;
    
    var result = await firestore.RevealComment(commId, postId, commentId);

    // // Send email alert to Admin
    // var adminData = user.data();
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "Admin (" + adminData.userName + ") revealed comment #" + commentId + " made by " + result.userName,
    //     html: "Admin (" + adminData.userName + ") revealed comment #" + commentId + " made by " + result.userName+ ".<br>" +
    //     "Comment: " + "<i>" + result.body_text + "</i>"
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to Blogger
    // var blogger = (await firestore.GetUserProfile(result.uid)).data();
    // var sendTo = blogger.email;
    // var message = {
    //     subject: "Your comment has been revealed",
    //     html: "Your comment has been revealed.<br>" +
    //     "Comment: <i>" + result.body_text + "</i>."
    // }
    // await firestore.SendEmail(message, sendTo);

    res.send({result: result})
    res.end();
    
});

//User Management
app.get('/manage_users' ,authValidate, async (req,res)=>{
    if(res.locals.uid == undefined)
    {
        res.redirect('/login');
        return;
    }

    var roles =[];

    var user = await firestore.GetUserProfile(res.locals.uid);

    if(!user.data().Roles.includes("Admin"))
    {
        res.redirect('/unauthorized');
        return;
    }

    roles = user.data().Roles;
    
    var users = await firestore.GetAllUserProfiles();

    res.render('pages/user_management',{
        users:users,
        loggedIn:true,
        roles:roles,
        user:user.data()
    });
});

app.get('/modify_user_profile', authValidate, async (req,res)=>{
    if(res.locals.uid == undefined)
    {
        res.redirect('/login');
        return;
    }
    
    var roles = [];

    var user = await firestore.GetUserProfile(res.locals.uid);

    if(!user.data().Roles.includes("Admin"))
    {
        res.redirect('/unauthorized');
        return;
    }

    var user = await firestore.GetUserProfile(req.query['uid']);

    roles = user.data().Roles;

    res.render('pages/mod_user_info',{
        user:user,
        loggedIn:true,
        roles:roles
    });

});

app.get('/view_my_profile', authValidate, async function (req,res){
    if(res.locals.uid == undefined)
    {
        res.redirect('/login');
        return;
    }
    
    var roles = [];

    
    var userDoc = await firestore.GetUserProfile(res.locals.uid);
    var user = userDoc.data();
    var uid = userDoc.id;
    roles = user.Roles;

    if(uid != req.query['uid'])
    {
        res.redirect('/unauthorized');
        return;
    }

    var formExists = await firestore.BecomePrinterFormExist(res.locals.uid);
    var permanentlyRejected = userDoc.data().permanently_reject_become_printer
    if(permanentlyRejected == undefined)
    {
        permanentlyRejected = false;
    }

    var favorites = [];
    var favs = await firestore.GetFavoritedCommunities(uid);
    if(favs.length > 0)
    {
        await Promise.all(favs.map(async (comm) =>  {
            commId = comm.data().commId;
            comm = await firestore.GetCommunity(commId);
            comm.id = commId;
            favorites.push(comm);
        })
        );
    }
    

    res.render('pages/view_my_profile',{
        user:user,
        loggedIn:true,
        roles:roles,
        uid:uid,
        formExists:formExists,
        permanentlyRejected:permanentlyRejected,
        favorites:favorites
    });
});

app.get('/update_my_profile', authValidate, async function (req,res){
    if(res.locals.uid == undefined)
    {
        res.render('pages/login');
    }
    
    var roles = [];

    var userDoc = await firestore.GetUserProfile(res.locals.uid);
    var user = userDoc.data();
    var uid = userDoc.id;
    roles = user.Roles;

    if(uid != req.query['uid'])
    {
        res.redirect('/unauthorized');
    }

    res.render('pages/update_my_profile',{
        user:user,
        loggedIn:true,
        roles:roles,
        uid:uid
    });
});

// Become a Printer
app.get('/become_printer', authValidate, async function(req, res){
    if(res.locals.uid == undefined)
    {
        res.render('pages/login');
    }

    var roles = [];

    var userDoc = await firestore.GetUserProfile(res.locals.uid);
    var user = userDoc.data();
    var uid = userDoc.id;
    roles = user.Roles;

    // Also unauthorized if Perma Denied
    if(uid != req.query['uid'])
    {
        res.redirect('/unauthorized');
        res.end();
        return;
    }

    if(roles.includes('Printer') || user.permanently_reject_become_printer){
        res.redirect('unauthorized')
        res.end();
        return;
    }

    var link = await paypal.GetOnBoardingLink();

    res.render('pages/become_printer',{
        user:user,
        loggedIn:true,
        roles:roles,
        uid:uid,
        onboardLink:link
    });
});

//Adding become Printer form
app.post('/add_printer_form', authValidate, async function(req, res){
    if(res.locals.uid == undefined)
    {
        res.render('pages/login');
    }

    var userDoc = await firestore.GetUserProfile(res.locals.uid);
    var uid = userDoc.id; 
    var fName = userDoc.data().FirstName;
    var lName = userDoc.data().LastName;
    var date = new Date();
    var zipCode = userDoc.data().ZipCode
    let formRoles = userDoc.data().Roles;

    var formObj = {paypal_email: req.body.paypal_email, uid:uid, comment:req.body.user_comment, fName:fName, lName:lName, date:date, zipCode:zipCode, formRoles:formRoles};
    
    await firestore.BecomePrinterForm(req.body.uid, formObj)

    // // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "A new 'Become Printer' form has been submitted",
    //     html: userDoc.data().userName + " has submitted a 'Become Printer' form"
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to Blogger
    // var sendTo = userDoc.data().email;
    // var message = {
    //     subject: "Your 'Become Printer' form has been successfully submitted",
    //     html: "Your 'Become Printer' form has been successfully submitted"
    // }
    // await firestore.SendEmail(message, sendTo);

    res.redirect('/')
});


// View become printer forms page
app.get('/view_become_printer_forms', authValidate, async function(req, res) {
    if(res.locals.uid == undefined)
    {
        res.redirect('/login');
        return;
    }

    let roles = [];
    var userDoc = await firestore.GetUserProfile(res.locals.uid);
    var user = userDoc.data();
    var uid = userDoc.id;
    roles = user.Roles;

    if(!user.Roles.includes("Admin"))
    {
        res.redirect('/unauthorized');
        return;
    }

    var becomePrinterForms = await firestore.GetBecomePrinterForms();

    res.render('pages/view_become_printer_forms', {
        becomePrinterForms:becomePrinterForms, 
        loggedIn:true,
        roles:roles,
        user:user,
        uid:uid
    });
});


// View single 'Become Printer' request page
app.get('/become_printer_form', authValidate, async function(req, res) {
    // Redirect if not logged in?

    var roles = [];
    var loggedIn;
    var user;
    var uid;
    if(res.locals.uid != undefined)
    {
        var userDoc = await firestore.GetUserProfile(res.locals.uid);
        user = userDoc.data();
        uid = userDoc.id;
        loggedIn = true;
        roles = user.Roles;
        if (!(roles.includes('Admin'))) {
            res.redirect('/unauthorized');
            return;
        }
    }
    else
    {
        loggedIn = false;
        user = {};
        uid = '';
        res.redirect('/login');
        return;
    }

    var formId = req.query['formID'];

    var formData = (await firestore.GetBecomePrinterForm(formId)).data();

    res.render('pages/become_printer_form', {
        formData : formData,
        formId : formId,
        formRoles : formData.formRoles,
        loggedIn:loggedIn,
        roles:roles,
        uid:uid,
        user:user,
    });
});

//Accept button is clicked
app.get('/accept_printer_form', authValidate, async function(req, res){
    if(res.locals.uid == undefined)
    {
        res.render('pages/login');
    }

    var printerUid = req.query['uid'];
    var userDoc = await firestore.GetUserProfile(printerUid);
    var printerRoles = userDoc.data().Roles; 

    if(!printerRoles.includes("Printer")){
        // Should always be true.
        printerRoles.push("Printer");
    }
    
    await firestore.UpdateUserRoles(printerUid, printerRoles);

    // Send adminComment in email

    await firestore.RemoveBecomePrinterForm(printerUid);

    // // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "The 'Become Printer' form submitted by " + userDoc.data().userName + " was accepted",
    //     html: "The 'Become Printer' form submitted by " + userDoc.data().userName + " was accepted. " +
    //     userDoc.data().userName + " is now a Printer!"
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to new Printer
    // var sendTo = userDoc.data().email;
    // var message = {
    //     subject: "Congratulations! You are now a Printer",
    //     html: "Your 'Become Printer' form has been accepted. You are now a Printer!"
    // }
    // await firestore.SendEmail(message, sendTo);

    res.redirect('/view_become_printer_forms');
});

//Reject button is clicked
app.get('/reject_printer_form', authValidate, async function(req, res){
    if(res.locals.uid == undefined)
    {
        res.render('pages/login');
    }

    var printerUid = req.query['uid'];
    var userDoc = await firestore.GetUserProfile(printerUid);
    var adminComment = req.query['adminComment'];
    // Send adminComment in email

    await firestore.RemoveBecomePrinterForm(printerUid);

    // // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "The 'Become Printer' form submitted by " + userDoc.data().userName + " was rejected",
    //     html: "The 'Become Printer' form submitted by " + userDoc.data().userName + " was rejected.<br>" + 
    //     "Comment: " + adminComment
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to person who submitted the form
    // var sendTo = userDoc.data().email;
    // var message = {
    //     subject: "Your 'Become Printer' form was rejected",
    //     html: "Your 'Become Printer' form was rejected.<br>" +
    //     "Comment: " + adminComment
    // }
    // await firestore.SendEmail(message, sendTo);

    res.redirect('/view_become_printer_forms');
});


//Add flag to user and reject become printer form
app.get('/permanently_reject_printer_form', authValidate, async function(req, res){
    if(res.locals.uid == undefined)
    {
        res.render('pages/login');
    }

    var printerUid = req.query['uid'];
    var userDoc = await firestore.GetUserProfile(printerUid);
    var adminComment = req.query['adminComment'];

    // Send adminComment in email

    await firestore.PermanentlyRejectFlag(printerUid);
    await firestore.RemoveBecomePrinterForm(printerUid);

    // // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: "The 'Become Printer' form submitted by " + userDoc.data().userName + " was permanently rejected",
    //     html: "The 'Become Printer' form submitted by " + userDoc.data().userName + " was permanently rejected.<br>" + 
    //     "Comment: " + adminComment
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to person who submitted the form
    // var sendTo = userDoc.data().email;
    // var message = {
    //     subject: "Your 'Become Printer' form was permanently rejected",
    //     html: "Your 'Become Printer' form was permanently rejected.<br>" +
    //     "Comment: " + adminComment
    // }
    // await firestore.SendEmail(message, sendTo);

    res.redirect('/view_become_printer_forms');
});


app.post('/get_user_roles',authValidate, async (req,res)=>{
    if(res.locals.uid == undefined)
    {
        res.status(401);
        res.send();
        res.end();
        return;
    }

    if(req.body.userUid != undefined)
    {
        var user = await firestore.GetUserProfile(req.body.userUid);
        var roles = user.data().Roles;


        res.send({roles:roles});
        res.end();
    }
});

app.post('/update_user_roles',authValidate, async (req,res)=>{
    if(res.locals.uid == undefined)
    {
        res.status(401);
        res.send();
        res.end();
        return;
    }

    if(req.body.roles != undefined)
    {
        var user = (await firestore.GetUserProfile(req.body.uid)).data();

        var oldRoles = user.Roles;

        var newRoles = req.body.roles;

        if((!oldRoles.includes('Printer')) && newRoles.includes('Printer'))
        {
            var coordinates = (await maps.GetCoordinates(user.ZipCode)).center;

            await firestore.AddPrinterToCoordinates(coordinates[1],coordinates[0], user.ZipCode);
        }
        else if(oldRoles.includes('Printer') && (!newRoles.includes('Printer')))
        {
            await firestore.RemovePrinterFromCoordinates(user.ZipCode);
        }

        var result = await firestore.UpdateUserRoles(req.body.uid, newRoles);

        // // Send email alert to Admin
        // var sendTo = "PrintAPart.Infrastructure@gmail.com"
        // var message = {
        //     subject: user.userName + "'s roles were updated",
        //     html: user.userName + "'s roles were updated. Their roles are now: " + newRoles.join()
        // }
        // await firestore.SendEmail(message, sendTo);

        // // Send email alert to person who submitted the form
        // var sendTo = user.email;
        // var message = {
        //     subject: "Your roles were updated",
        //     html: "Your roles were updated. They are now: " + newRoles.join()
        // }
        // await firestore.SendEmail(message, sendTo);

        res.send('ok');
        res.end();
    }
});

app.post('/update_user_image', authValidate, async (req,res)=>{

    if(res.locals.uid == undefined)
    {
        res.status(401);
        res.send();
        res.end();
        return;
    }

    var userDoc = await firestore.GetUserProfile(req.body.uid);
    var updatedUser = userDoc.data();
    updatedUser.profileImage = req.body.updatedImage;

    var result = await firestore.UpdateUserProfile(req.body.uid, updatedUser);

    res.send("");
    res.end();
});

app.post('/update_user_info',authValidate, async (req,res)=>{
    if(res.locals.uid == undefined)
    {
        res.redirect('/login');
    }

    var user = await firestore.GetUserProfile(res.locals.uid);

    if(!user.data().Roles.includes("Admin"))
    {
        res.redirect('/unauthorized');
        return;
    }



    var userDoc = await firestore.GetUserProfile(req.body.uid);
    var updatedUser = userDoc.data();
    updatedUser.userName = req.body.userName;
    updatedUser.FirstName = req.body.FirstName;
    updatedUser.LastName = req.body.LastName;
    updatedUser.email = req.body.email;
    updatedUser.ZipCode = req.body.ZipCode;
    if(req.body.PayPalEmail != undefined)
    {
        updatedUser.PayPalEmail = req.body.PayPalEmail;
    }

    var result = await firestore.UpdateUserProfile(req.body.uid, updatedUser);
    await admin.auth().updateUser(userDoc.id, {email: updatedUser.email});
    var oldName = userDoc.data().userName;
    // if(updatedUser.userName != oldName)
    // {
    //     await firestore.DeleteUserName(oldName);
    //     var uidObj = {uid:userDoc.id};
    //     await firestore.AddUserName(updatedUser.userName,uidObj);
    // }

    if(userDoc.data().Roles.includes('Printer'))
    {
        await firestore.RemovePrinterFromCoordinates(userDoc.data().ZipCode);
        var coordinates = (await maps.GetCoordinates(updatedUser.ZipCode)).center;

        await firestore.AddPrinterToCoordinates(coordinates[1],coordinates[0], updatedUser.ZipCode);
    }

    // // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: updatedUser.userName + "'s profile information was updated",
    //     html: updatedUser.userName + "'s profile information was updated"
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to user who updated their info
    // var sendTo = updatedUser.email;
    // var message = {
    //     subject: "You updated your profile information",
    //     html: "You updated your profile information."
    // }
    // await firestore.SendEmail(message, sendTo);

    res.redirect('manage_users');
});

app.post('/delete_users', authValidate, async function (req,res){
    if(res.locals.uid == undefined)
    {
        res.status(401);
        res.send();
        res.end();
        return;
    }

    uids = req.body.uids;

    try{
        uids.forEach(async (id) =>  {
            await firestore.DeleteUser(id);
            await admin.auth().deleteUser(id);
        });
        
        // // Send email alert to Admin
        // adminData = (await firestore.GetUserProfile(res.locals.uid)).data();
        // var sendTo = "PrintAPart.Infrastructure@gmail.com"
        // var message = {
        //     subject: "Admin (" + adminData.userName + ") has deleted users",
        //     html: "Admin (" + adminData.userName + ") has deleted the following users:<br>" + uids.join()
        // }
        // await firestore.SendEmail(message, sendTo);

        res.send("")
        res.end();
    }
    catch (e) {
        res.status(500);
        res.send("Error deleting users");
        res.end();
    }

    
});

app.post('/reset_user_pass',authValidate, async function (req,res){

    if(res.locals.uid == undefined)
    {
        res.status(401);
        res.send();
        res.end();
        return;
    }

    uids = req.body.uids;

    var email;
    uids.forEach(async (id) =>  {
        email = (await firestore.GetUserProfile(id).data()).email;
        try{
            await admin.auth().sendPasswordResetEmail(emailAddress)
        }
        catch(e){
            res.status(500);
            res.send(e.message);
            res.end();
            return;
        }
        
    });

});

app.post('/get_user_data', authValidate,async function (req,res){
    if(res.locals.uid == undefined)
    {
        res.status(401);
        res.send();
        res.end();
        return;
    }
    var users = [];
    var uids = req.body.uids;
    await Promise.all(uids.map(async (uid) => {
        try{
            var userRecord = await admin.auth().getUser(uid)
            users.push(userRecord.email);
        }
        catch(error)
        {
            console.log('Error fetching user data:', error);
            res.status(500);
            res.send(error);
            res.end();
            return;
        }

    }));

    var data = {emails:users};
    res.send(data);
    res.end();

});

app.post('/update_my_info', authValidate, async function (req,res){
    if(res.locals.uid == undefined)
    {
        res.redirect('pages/login');
    }

    var user = await firestore.GetUserProfile(res.locals.uid);


    if(user.id != req.body.uid)
    {
        res.redirect('/unauthorized');
        return;
    }

    var userDoc = await firestore.GetUserProfile(req.body.uid);
    var updatedUser = userDoc.data();
    updatedUser.userName = req.body.userName;
    updatedUser.FirstName = req.body.FirstName;
    updatedUser.LastName = req.body.LastName;
    updatedUser.email = req.body.email;
    updatedUser.ZipCode = req.body.ZipCode;
    if(req.body.PayPalEmail != undefined)
    {
        updatedUser.PayPalEmail = req.body.PayPalEmail;
    }

    var result = await firestore.UpdateUserProfile(req.body.uid, updatedUser);

    var oldName = userDoc.data().userName;
    if(userDoc.data().Roles.includes('Printer'))
    {
        await firestore.RemovePrinterFromCoordinates(userDoc.data().ZipCode);
        var coordinates = (await maps.GetCoordinates(updatedUser.ZipCode)).center;

        await firestore.AddPrinterToCoordinates(coordinates[1],coordinates[0], updatedUser.ZipCode);
    }
    
    // // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com"
    // var message = {
    //     subject: updatedUser.userName + "'s profile information was updated",
    //     html: updatedUser.userName + "'s profile information was updated"
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to user who updated their info
    // var sendTo = updatedUser.email;
    // var message = {
    //     subject: "You updated your profile information",
    //     html: "You updated your profile information."
    // }
    // await firestore.SendEmail(message, sendTo);

    res.redirect(('view_my_profile?uid=' + user.id));
});

app.post('/add_printer_zip', authValidate, async function (req,res){

    if(res.locals.uid == undefined)
    {
        res.status(401);
        res.send();
        res.end();
        return;
    }

    var user = (await firestore.GetUserProfile(req.body.printerUid)).data();

    var coordinates = (await maps.GetCoordinates(user.ZipCode)).center;

    await firestore.AddPrinterToCoordinates(coordinates[1],coordinates[0], req.body.zip);
    res.send();
    res.end();
});

app.post('/remove_printer_zip', authValidate, async function (req,res){

    if(res.locals.uid == undefined)
    {
        res.status(401);
        res.send();
        res.end();
        return;
    }

    var user = (await firestore.GetUserProfile(req.body.printerUid)).data();

    var zip = user.ZipCode;
    await firestore.RemovePrinterFromCoordinates(zip);

    res.send();
    res.end();
});

app.post('/record_payment',authValidate,async function(req,res){
    var user;
    var roles = [];
    var loggedIn;
    if(res.locals.uid != undefined)
    {
        user = (await firestore.GetUserProfile(res.locals.uid)).data();
        loggedIn = true;
        roles = user.Roles;
    }
    else{
        loggedIn = false;
        user = {};
    }

    if(roles.length < 1)
    {
        res.redirect('Unauthorized');
    }

    await firestore.SaveTransactionDetails(req.body.details);

    var printerData = (await firestore.GetUserProfile(req.body.printerID)).data();

    var requestId = req.body.requestId;

    firestore.UpdateRequestStatus(requestId,"6");

    var date = new Date();
    var commentObj = {
        commentDate : date,
        userName : "PrintAPart",
        body_text : "Requester paid for print"
    }
    
    var addCommResult = await firestore.AddCommentToRequest(requestId, commentObj);

    // // Send email alert to Admin
    // var sendTo = "PrintAPart.Infrastructure@gmail.com";
    // var requestData = await firestore.GetRequest(requestId);
    // var requesterData = (await firestore.GetUserProfile(requestData.uid)).data();
    // var printerData = (await firestore.GetUserProfile(requestData.claimedBy)).data();
    // var message = {
    //     subject: "Requester (" + requesterData.userName + ") paid for print",
    //     html: "Requester (" + requesterData.userName + ") paid for print request #" + requestId
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to Requester
    // var sendTo = requesterData.email;
    // var message = {
    //     subject: "You've paid for your print request #" + requestId,
    //     html: "You've paid Printer " + printerData.userName + " for your print request #" + requestId + "."
    // }
    // await firestore.SendEmail(message, sendTo);

    // // Send email alert to the Printer that claimed the request
    // var sendTo = printerData.email;
    // var message = {
    //     subject: "You've been paid for print request #" + requestId,
    //     html: "You've been paid by " + requesterData.userName +" for print request #" + requestId
    //     }   
    // await firestore.SendEmail(message, sendTo);

    res.send("");
    res.end();

});

//Add favorited Community
app.post('/add_community_favorite',authValidate, async function (req,res){

    if(res.locals.uid == undefined)
    {
        res.status(401);
        res.send();
        res.end();
        return;
    }
    
    var uid = res.locals.uid;
    var commId = req.body.commId;

    await firestore.AddFavorite(commId, uid);

    res.send();
    res.end();
})

//Remove favorited Community
app.post('/remove_community_favorite',authValidate, async function (req,res){

    if(res.locals.uid == undefined)
    {
        res.status(401);
        res.send();
        res.end();
        return;
    }
    
    var uid = res.locals.uid;
    var commId = req.body.commId;

    await firestore.RemoveFavorite(commId, uid);

    res.send();
    res.end();
});

//Community Management
app.get('/manage_communities' ,authValidate, async function (req,res){
    if(res.locals.uid == undefined)
    {
        res.redirect('/login');
        return;
    }

    var roles =[];
    var communities = await firestore.GetCommunities();

    var user = await firestore.GetUserProfile(res.locals.uid);

    if(!user.data().Roles.includes("Admin"))
    {
        res.redirect('/unauthorized');
        return;
    }

    roles = user.data().Roles;
    
    var users = await firestore.GetAllUserProfiles();

    res.render('pages/community_management',{
        users:users,
        communities:communities,
        loggedIn:true,
        roles:roles,
        user:user.data()
    });
});

app.post('/add_community',authValidate, async function(req,res){
    var formData = req.body;

    var commId = formData.commId;
    

    await firestore.AddCommunity(formData);

    res.redirect('/manage_communities');
});
    

app.post('/delete_communities', authValidate, async function (req,res){
    if(res.locals.uid == undefined)
    {
        res.status(401);
        res.send();
        res.end();
        return;
    }

    commIds = req.body.commIDs;

    try{
        commIds.forEach(async (id) =>  {
            await firestore.DeleteCommunity(id)
            var users = await firestore.GetAllUserProfiles();
            users.forEach(async (user) => {
                await firestore.DeleteCommunityFromUsers(id,user.id);
        });

        });
        
        

        res.send("")
        res.end();
    }
    catch (e) {
        res.status(500);
        res.send("Error deleting communities");
        res.end();
    }

    
});

    

app.get('/create_community' ,authValidate, async function (req,res){
    if(res.locals.uid == undefined)
    {
        res.redirect('/login');
        return;
    }

    var roles =[];
    var communities = await firestore.GetCommunities();

    var user = await firestore.GetUserProfile(res.locals.uid);

    if(!user.data().Roles.includes("Admin"))
    {
        res.redirect('/unauthorized');
        return;
    }

    roles = user.data().Roles;
    
    var users = await firestore.GetAllUserProfiles();

    res.render('pages/create_community',{
        users:users,
        communities:communities,
        loggedIn:true,
        roles:roles,
        user:user.data()
    });
});


//Auth Middleware
async function authValidate(req, res, next) {
    if(req.cookies['bearer'] != undefined)
    {
        var idToken = req.cookies['bearer']
        await admin.auth().verifyIdToken(idToken).then(async function (decodedToken) {
        const uid = decodedToken.uid;

        var user = (await firestore.GetUserProfile(uid)).data();
        if(!user.SetupComplete)
        {
            res.redirect("/new_user?uid=" + uid + "&email=" + user.email);
            return;
        }

        res.locals.uid = uid;

        })
        .catch((error) => {
            console.log(error);
            res.clearCookie('bearer');
        });
    }
    next();
}

app.listen(8080);
console.log('Node Server running on 8080');