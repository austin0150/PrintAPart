const {Firestore} = require('@google-cloud/firestore');

// Create a new client
//const firestore = new Firestore();

const db = new Firestore({
    projectId: 'printapart',
    keyFilename: '{keyfile}',
  });
  

//Record Transaction Details
exports.SaveTransactionDetails = async function(details)
{
  var result = await db.collection('TransactionDetails').add(details);
}

//Gets all communities from the collection and returns an array of community documents
exports.GetCommunities = async function ()
{
  var commList = [];
  const comms = await db.collection('communities').orderBy('name').get();
  comms.forEach(doc => {
    commList.push(doc);
  });
  return commList;
}

//Search communties
exports.SearchCommunity = async function(commSearch)
{
  var commList = [];
  const comms = await db.collection('communities').where('name','==',commSearch).get();
  comms.forEach(doc => {
    commList.push(doc);
  });
  return commList;
}

//Gets all requests from the collection and returns an array of request documents
exports.GetRequests = async function ()
{
  var requestList = [];
  const requests = await db.collection('requests').orderBy('uploadDate', 'desc').get();
  requests.forEach(doc => {
    requestList.push(doc);
  });
  return requestList;
}

exports.GetRequestsByStatus = async function (status)
{
  var requestList = [];
  const requests = await db.collection('requests').where("StatusNumber",'==',status).orderBy('uploadDate', 'desc').get();
  requests.forEach(doc => {
    requestList.push(doc);
  });
  return requestList;
}

//Get community from id
exports.GetCommunity = async function(id)
{
  const comm = await db.collection('communities').doc(id).get();
  return comm.data();
}

//Get request from id
exports.GetRequest = async function(id)
{
  const request = await db.collection('requests').doc(id).get();
  return request.data();
}

//Add Comment to request
exports.AddCommentToRequest = async function (requestId, requestObj)
{
  const result = await db.collection('requests').doc(requestId).collection('comments').add(requestObj);
  return result;
}

//Get Comments From Request
exports.GetCommentsFromRequest = async function (requestId)
{
  var commentList = [];
  const comments = await db.collection('requests').doc(requestId).collection('comments').orderBy('commentDate','desc').get();
  comments.forEach(doc => {
    commentList.push(doc);
  });
  return commentList;
}

//Removes a request
exports.RemoveRequest = async function (requestId)
{
  const result = await db.collection('requests').doc(requestId).delete();
  
  return result;
}

exports.UpdateRequestStatus = async function (requestId, status)
{
  await db.collection('requests').doc(requestId).update({StatusNumber:status});
  return;
}


//Approve request from id
exports.ApproveRequest = async function(requestId)
{
  await db.collection('requests').doc(requestId).update({StatusNumber : "2"});
  return;
}

//Deny request from id
exports.DenyRequest = async function(requestId)
{
  const adminRejected = true;
  await db.collection('requests').doc(requestId).update({StatusNumber : "4"});
  return;
}

//Drop request from id
exports.DropRequest = async function(requestId)
{
  await db.collection('requests').doc(requestId).update({claimedBy : null, StatusNumber : "2"});
  return;
}

//Cancel request from id
exports.CancelRequest = async function(requestId)
{
  await db.collection('requests').doc(requestId).update({ StatusNumber : "9"});
}

//Complete request from id
exports.CompleteRequest = async function (requestId)
{
  await db.collection('requests').doc(requestId).update({ StatusNumber : "8"});
}
  
exports.DisputeRequest = async function (requestId)
{
  await db.collection('requests').doc(requestId).update({ StatusNumber : "7"});
}

//Flag request from id
exports.FlagRequest = async function(requestId)
{
  await db.collection('requests').doc(requestId).update({claimedBy : null, StatusNumber : "1"});
  return;
}

//Claim request from id
exports.ClaimRequest = async function(requestId, printerId)
{
  const claimedBy = printerId;
  await db.collection('requests').doc(requestId).update({claimedBy : claimedBy, StatusNumber : "3"});
  return;
}

//Printer approve request from id
exports.PrinterApproveRequest = async function(requestId)
{
  await db.collection('requests').doc(requestId).update({StatusNumber : "5"});
  return;
}

//Get all claimed requests of a specific Printer from printerId
exports.GetPrintersClaimedRequests = async function(printerId, StatusNumber)
{
  var claimedRequestList = [];
  const claimedRequests = await db.collection('requests').where("claimedBy", "==", printerId).where("StatusNumber", "==", StatusNumber).orderBy('uploadDate', 'desc').get();
  claimedRequests.forEach(doc => {
    claimedRequestList.push(doc);
  });
  return claimedRequestList;
}

//Get all requests of a Requester
exports.GetRequestsOfRequester = async function(requesterId, StatusNumberList)
{
  var requestList = [];
  const requests = await db.collection('requests').where("uid", "==", requesterId).where("StatusNumber", "in", StatusNumberList).orderBy('uploadDate', 'desc').get();
  requests.forEach(doc => {
    requestList.push(doc);
  });
  return requestList;
}

//Get blog post from community and blog post ids
exports.GetBlogPost = async function(commId, postId)
{
  const blog_post = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).get();
  return blog_post.data();
}

//Takes an object representing community data, adds the community to the Collection and returns the auto-generated ID
exports.AddCommunity = async function (commObj)
{
  const result = await db.collection('communities').add(commObj);
  return result.id;
}

//Update Community
exports.UpdateCommunity = async function (commId, commObj)
{
  const commDoc = db.collection('communities').doc(commId);
  const result = await commDoc.update(commObj);

  return result;
}

//Delete Community
exports.DeleteCommunity = async function(commId)
{
  const result = await db.collection('communities').doc(commId).delete();
  return result;
}

exports.DeleteCommunityFromUsers = async function(commId, uid)
{
  const user = await db.collection('users').doc(uid).collection('favorite_communities').doc(commId).delete();
}

//Read user
//Takes a user's UID and returns the user's document
exports.GetUserProfile = async function (userUid)
{
    // Obtain a document reference.
    const document = await db.collection('users').doc(userUid).get();
    return document;

}

//check if a user profile exists
exports.CheckUserProfile = async function (uid)
{
  const ref = await db.collection('users').doc(uid);
  const doc = await ref.get();
    
  if (!doc.exists) {
    return false;
  } else {
    return true;
  }
}

exports.GetAllUserProfiles = async function ()
{
  const users = await db.collection('users').get();
  return users;
}

//Update user
exports.UpdateUserProfile = async function (uid, userObj)
{
  const userDoc = db.collection('users').doc(uid);
  const result = await userDoc.update(userObj);

  return result;
}

exports.UpdateUserRoles = async function(uid, roles)
{
  const user = db.collection('users').doc(uid);
  const result = await user.update({Roles:roles});
  return result;
}

//Add New User
exports.AddUser = async function (uid, userObj)
{
  //We should make sure ther userName doesn't exist

  const result = await db.collection('users').doc(uid).set(userObj);
  return result;
}


//Delete User
exports.DeleteUser = async function (uid)
{
  const result = await db.collection('users').doc(uid).delete();
  return result;
}

//Get all zips
exports.GetZipDocuments = async function ()
{
  var collection = await db.collection('zipcode_map').get();
  return collection;
}

//Get single zip document
exports.GetZipDocument = async function (zip)
{
  var zipDoc = await db.collection('zipcode_map').doc(zip).get();
  return zipDoc;
}

//Increment Printer Zip
exports.AddPrinterToCoordinates = async function (lat,long,zip)
{
  var newCount;
  var zipDoc = await db.collection('zipcode_map').doc(zip).get();
  if(zipDoc.exists)
  {
    var currentCount = (await db.collection('zipcode_map').doc(zip).get()).data().count;
    newCount = currentCount + 1;

  }
  else{
    newCount = 1;
  }

  var docObj = {
    count:newCount,
    lat:lat,
    long:long
  };

  const result = await db.collection('zipcode_map').doc(zip).set(docObj);

  return result;
}

exports.RemovePrinterFromCoordinates = async function(zip)
{
  var newCount;
  var zipDoc = await db.collection('zipcode_map').doc(zip).get();
  var result;
  if(zipDoc.exists)
  {
    var currentCount = (await db.collection('zipcode_map').doc(zip).get()).data().count;
    newCount = currentCount - 1;
    if(newCount == 0)
    {
      result = await db.collection('zipcode_map').doc(zip).delete();
      return result;
    }

  }
  else{
    return;
  }

  var docObj = {
    count:newCount,
    lat:zipDoc.data().lat,
    long:zipDoc.data().long
  };

  result = await db.collection('zipcode_map').doc(zip).update(docObj);

  return result;
}

//Add Post
exports.AddPost = async function (postObj)
{
  const result = await db.collection('blog_posts').doc(postObj.community).collection('blog_posts').add(postObj);
  return result;
}

//Add tags
exports.AddTags = async function (tags, commId)
{
  for(i=0; i<tags.length; i++){
    await db.collection('communities').doc(commId).collection('tags').doc(tags[i]).set({tag_name:tags[i]});
  }
  return;
}

// Get tags from a specific community
exports.GetTags = async function (commId)
{
  var tagList = [];
  const tags = await db.collection('communities').doc(commId).collection('tags').get();
  tags.forEach(doc => {
    tagList.push(doc);
  });
  return tagList;
}

//Add Like on post
exports.AddLikeToPost = async function (likeObj)
{
  const result = await db.collection('blog_posts').doc(likeObj.commId).collection('blog_posts').doc(likeObj.postId).collection('likes').doc(JSON.stringify(likeObj.uid)).set(likeObj);
  return result;
}

//Remove like from post
exports.RemoveLikeFromPost = async function (commId, postId, likeId)
{
  const result = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('likes').doc(JSON.stringify(likeId)).delete();
  return result;
}

exports.GetLikesFromBlogPost = async function (commId, postId)
{
  var likeList = [];
  const likes = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('likes').get();
  likes.forEach(doc => {
    likeList.push(doc);
  });
  return likeList;
}

//Add Like to comment
exports.AddLikeToComment = async function (commId, postId, commentId, likeObj, commentLikeObj, uid)
{
  const result = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').doc(commentId).collection('likes').doc(JSON.stringify(likeObj.uid)).set(likeObj);
  const userObj = await db.collection('users').doc(uid).collection('commentLikes').doc(commentId).set(commentLikeObj);
  const comment = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').doc(commentId).get();
  const newNumLikes = comment.data().numLikes + 1;
  await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').doc(commentId).update({numLikes : newNumLikes});
  return result;
}

//Remove like from comment
exports.RemoveLikeFromComment = async function (commId, postId, commentId, likeId, uid)
{
  const result = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').doc(commentId).collection('likes').doc(JSON.stringify(likeId)).delete();
  const userObj = await db.collection('users').doc(uid).collection('commentLikes').doc(commentId).delete();
  const comment = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').doc(commentId).get();
  const newNumLikes = comment.data().numLikes - 1;
  await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').doc(commentId).update({numLikes : newNumLikes});
  return result;
}

//Get all likes from a specific comment
exports.GetLikesFromComment = async function (commId, postId, commentId)
{
  var likeList = [];
  const likes = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').doc(commentId).collection('likes').get();
  likes.forEach(doc => {
    likeList.push(doc);
  });
  return likeList;
}

//Get all user-specific liked comments
exports.GetUserLikedComments = async function (uid)
{
  var commentList = [];
  const comments = await db.collection('users').doc(uid).collection('commentLikes').get();
  comments.forEach(doc => {
    commentList.push(doc);
  });
  return commentList;
}

// Restrict comment or reply
exports.RestrictComment = async function (commId, postId, commentId)
{
  var comment = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').doc(commentId).get();
  const newAccessibleAttr = "no";
  await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').doc(commentId).update({accessible : newAccessibleAttr});
  return comment.data();
}

// Reveal comment or reply
exports.RevealComment = async function (commId, postId, commentId)
{
  var comment = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').doc(commentId).get();
  const newAccessibleAttr = "yes";
  await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').doc(commentId).update({accessible : newAccessibleAttr});
  return comment.data();
}


//Update Post
exports.UpdatePost = async function(postId, postObj)
{
  const post = db.collection('blog_posts').doc(postObj.community).collection('blog_posts').doc(postId);
  const result = await post.update(postObj);

  return result;
}

//Delete Post
exports.DeletePost = async function (postId,commId)
{
  const result = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).delete();
  return result;
}

//Delete Comment
exports.DeleteComment = async function (postId,commId, commentId)
{
  const result = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').doc(commentId).delete();
  return result;
}

//Flag Blog Post
exports.FlagBlogPost = async function (commId, postId, noteObj)
{
  const post = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).get();
  const newFlaggedAttr = true;
  await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).update({flagged : newFlaggedAttr});
  const result = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('flagged_notes').add(noteObj);
  return post;
}

//Admin Unflag Blog Post; If the post is unflagged and then re-flagged, the previous flagged reports will still appear
exports.UnflagBlogPost = async function (commId, postId)
{
  const newFlaggedAttr = false;
  await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).update({flagged : newFlaggedAttr});
  var post = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).get();
  return post
}

//Get notes/comments of flagged posts
exports.GetFlaggedNotesOfPosts = async function (commId, postId)
{
  var commentList = [];
  const comments = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('flagged_notes').orderBy('commentDate','desc').get();
  comments.forEach(doc => {
    commentList.push(doc);
  });
  return commentList;
}

// Delete blog post
exports.DeleteBlogPost = async function (commId, postId)
{
  const post = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).get();
  const newAccessibleAttr = false;
  await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).update({accessible : newAccessibleAttr});
  return post;
}

//Get Posts From Community
exports.GetPostsFromCommunity = async function (commId, view_flagged)
{
  var postList = [];
  var posts;
  if (view_flagged){
    // If view_flagged is true, that means we only want to retrieve the flagged posts
    posts = await db.collection('blog_posts').doc(commId).collection('blog_posts').where('flagged', '==', view_flagged).orderBy('reviewDate','desc').get();
  } else {
    // Otherwise, we want to retrieve all posts
    posts = await db.collection('blog_posts').doc(commId).collection('blog_posts').orderBy('reviewDate','desc').get();
  }
  
  //const posts = await db.collection('blog_posts').doc(commId).collection('blog_posts').orderBy('reviewDate','desc').get(); 
  posts.forEach(doc => {
    postList.push(doc);
  });
  return postList;
}

//Add Request
exports.AddRequest = async function (requestObj)
{
  const result = await db.collection('requests').add(requestObj);
  return result;
}

//Add Comment to blog post
exports.AddComment = async function (commentObj)
{
  const result = await db.collection('blog_posts').doc(commentObj.community).collection('blog_posts').doc(commentObj.postId).collection('comments').add(commentObj);
  return result;
}

//Add to reply count
exports.AddToReplyCount = async function (commId, postId, commentId)
{
  const comment = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').doc(commentId).get();
  const newNumReplies = comment.data().numReplies + 1;
  await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').doc(commentId).update({numReplies : newNumReplies});
  return newNumReplies
}

//Get Comments From Blog Post
exports.GetCommentsFromBlogPost = async function (commId, postId, filter)
{
  var commentList = [];
  var comments;
  if(filter == "newest"){
    comments = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').orderBy('commentDate','desc').get();
  } else if (filter == "oldest") {
    comments = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').orderBy('commentDate').get();
  } else if (filter == "7") {
    var seven_days_ago = new Date();
    seven_days_ago.setDate(seven_days_ago.getDate() - 7);
    comments = await db.collection('blog_posts').doc(commId).collection('blog_posts').doc(postId).collection('comments').orderBy('commentDate','desc').where('commentDate', '>', seven_days_ago).get();
  }
  
  comments.forEach(doc => {
    commentList.push(doc);
  });
  return commentList;
}






//Create become Printer Request
exports.BecomePrinterForm = async function (uid, formObj)
{
  const result = await db.collection('become_printer_forms').doc(uid).set(formObj);
  return result;
}

//Get all Become Printer Forms
exports.GetBecomePrinterForms = async function ()
{
  var becomePrinterForms = []
  const forms = await db.collection('become_printer_forms').get();
  forms.forEach(doc => {
    becomePrinterForms.push(doc)
  });
  return becomePrinterForms;
}

//Get single Become Printer Form
exports.GetBecomePrinterForm = async function (formID)
{
  //formID is the uid of the user who sent the form. 
  const form = await db.collection('become_printer_forms').doc(formID).get();
  return form;
}

//Does BecomePrinterForm exist for a particular user. Used for Become Printer button on view_my_profile page.
exports.BecomePrinterFormExist = async function (uid)
{
  const form = await db.collection('become_printer_forms').doc(uid).get();
  if(form.exists){return true}else{return false};

}

//Removes a become printer form from view page
exports.RemoveBecomePrinterForm = async function (uid)
{
  const form = await db.collection('become_printer_forms').doc(uid).delete();
  
  // returns form details incase ever needed
  return form;
}

//Add Permanently Reject Printer flag
exports.PermanentlyRejectFlag = async function (uid)
{
  const result = await db.collection('users').doc(uid).update({permanently_reject_become_printer: true});
  return result;
}

exports.RemovePermaRejectFlag = async function (uid)
{
  const result = await db.collection('users').doc(uid).update({permanently_reject_become_printer: false});
  return result;
}

//Add Favorite to user profile
exports.AddFavorite = async function (commId, uid)
{
  const userFavs = await db.collection('users').doc(uid).collection('favorite_communities').doc(commId).set({commId:commId});
  return userFavs;
}

//Remove Favorite from user profile
exports.RemoveFavorite = async function (commId, uid)
{
  const userFavs = await db.collection('users').doc(uid).collection('favorite_communities').doc(commId).delete();
  return userFavs;
}

//Get Favorited Communities of User
exports.GetFavoritedCommunities = async function (uid)
{
  var favoritedCommunitiesList = [];
  const communities = await db.collection('users').doc(uid).collection('favorite_communities').get();
  communities.forEach(doc => {
    favoritedCommunitiesList.push(doc);
  });
  return favoritedCommunitiesList;
}

//Get Posts from communities
exports.GetPostsFromCommunities = async function (commIds)
{
  var postList = [];

  var counter = 0;

  var comms = [];

  
  while(commIds.length > 0)
  {
    comms.push(commIds.pop());
    if(comms.length == 10)
    {
      const posts = await db.collectionGroup('blog_posts').where('community', 'in', comms).orderBy('reviewDate','desc').get();
      posts.forEach(doc => {
        postList.push(doc);
      });
      comms = [];
    }
  }
  if(comms.length > 0)
  {
    const posts = await db.collectionGroup('blog_posts').where('community', 'in', comms).orderBy('reviewDate','desc').get();
    posts.forEach(doc => {
      postList.push(doc);
    });
  }
  
  return postList;

}

// exports.SendEmail = async function (message, sendTo) {
//   await db.collection('mail').add({
//     to: sendTo,
//     message: message
//   });
// }


