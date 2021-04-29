const { should } = require('chai');
const chai = require('chai')
const expect = chai.expect

const firestore = require('../scripts/firestore_actions');

// INTEGRATION TESTS FOR THE FIRESTORE ACTIONS MODULE

describe("firestore GetUserProfile function", () => {

	it("should return a document with an id matching the call", async ()=> {
		expect(
			(await firestore.GetUserProfile('1M0tH0UtapMcQpzQjtVe8xW9ELy2')).id)
			.to.equal('1M0tH0UtapMcQpzQjtVe8xW9ELy2');
	})

});

describe("firestore CheckUserProfile function", () => {

	it("Should return true when given an existing user", async ()=> {
		expect(
			await firestore.CheckUserProfile('1M0tH0UtapMcQpzQjtVe8xW9ELy2'))
			.to.be.true;
	})

})

describe("Requests Firestore Functions", () => {

	uid = '111222333444555666';
	var requestId = "a5WEXFz4sRmIHmGrQ3xh";
	var printerId = "djBhiJrORkcaL0cERUAiQSfpEgS2";
    var requestObj = {
        StatusNumber: "1", 
        adminApproved:false,
        adminRejected:false, 
		calculatedPrice:1,
		claimedBy: null,
		files: [],
		material: "PLA",
		message: "My Request",
		printerApproved: false,
		uploadDate: new Date(),
		uid:uid,
		userName: "userName", 
		zipCode:'12345',
		weight: 50
	};

    it("Result list length should be greater than 0 when calling GetRequests()", async () => {
        var result = await firestore.GetRequests();
        expect(result.length).to.be.greaterThan(0);
	});

	it("Result list should have requests of given status number after GetRequestsByStatus()", async () => {
		var result = await firestore.GetRequestsByStatus("1");
		for (var i=0; i<result.length; i++){
			expect(result[i].data().StatusNumber).to.equal("1");
		}
	});

	it("Should get requests claimed by given printer ID", async () => {
		var result = await firestore.GetPrintersClaimedRequests(printerId, "5");
		for (var i=0; i<result.length; i++){
			expect(result[i].data().claimedBy).to.equal(printerId);
		}
	});

	it("Should get requests with a specific request ID", async () => {
		var result = await firestore.GetRequestsOfRequester("pDrL0Grri3V6x2UlZGDZPvcuV0b2", ["1"]);
		for (var i=0; i<result.length; i++){
			expect(result[i].data().uid).to.equal("pDrL0Grri3V6x2UlZGDZPvcuV0b2");
		}
	});
	
	it("Testing add, get, delete", async () => {
		var result = await firestore.AddRequest(requestObj);
		var requestId = result.id;
		expect(requestId).to.exist;

		var result = await firestore.GetRequest(requestId);
		expect(result.message).to.equal("My Request");
		
		var result = await firestore.RemoveRequest(requestId);
        expect(result._writeTime).to.exist;

        var readRes = await firestore.GetRequest(requestId);
        expect(readRes).to.be.undefined;
	});
	
	it("Document can be updated by status number", async () => {
		// Get old status number
		var result = await firestore.GetRequest(requestId);
		var oldStatus = result.StatusNumber;
		
		// Set new status number
		var newStatus = "3";
		await firestore.UpdateRequestStatus(requestId, newStatus);
		var result = await firestore.GetRequest(requestId);
		expect(result.StatusNumber).to.equal(newStatus);

		// Re-set the status number to the original status number
		await firestore.UpdateRequestStatus(requestId, oldStatus);
		var result = await firestore.GetRequest(requestId);
		expect(result.StatusNumber).to.equal(oldStatus);

	});
	
	it("Request can be approved", async () => {
		// Approve request
		await firestore.ApproveRequest(requestId);
		var result = await firestore.GetRequest(requestId);
		expect(result.StatusNumber).to.equal("2");
	});
	
	it("Request can be denied", async () => {
		// Deny request
		await firestore.DenyRequest(requestId);
		var result = await firestore.GetRequest(requestId);
		expect(result.StatusNumber).to.equal("4");
	});
	
	it("Request can be cancelled", async () => {
		// Cancel request
		await firestore.CancelRequest(requestId);
		var result = await firestore.GetRequest(requestId);
		expect(result.StatusNumber).to.equal("9");
	});

	it("Request can be flagged", async () => {
		// Flag request
		await firestore.FlagRequest(requestId);
		var result = await firestore.GetRequest(requestId);
		expect(result.StatusNumber).to.equal("1");
		expect(result.claimedBy).to.be.null;
	});

	it("Request can be claimed", async () => {
		// Claim request
		await firestore.ClaimRequest(requestId, uid);
		var result = await firestore.GetRequest(requestId);
		expect(result.StatusNumber).to.equal("3");
		expect(result.claimedBy).to.equal(uid);
	});

	it("Printer can approve request", async () => {
		// Printer approve request
		await firestore.PrinterApproveRequest(requestId);
		var result = await firestore.GetRequest(requestId);
		expect(result.StatusNumber).to.equal("5");
	});
	
	it("Request can be dropped", async () => {
		// Drop request
		await firestore.DropRequest(requestId);
		var result = await firestore.GetRequest(requestId);
		expect(result.StatusNumber).to.equal("2");
		expect(result.claimedBy).to.be.null;
	});


});

describe("Request comments", () => {

	uid = '111222333444555666'
	requestId = "9NADjarHp1KLyso6v8tJ";
    var commentObj = {
        body_text: "test comment", 
        commentDate: new Date(),
        uid:uid, 
        userName:"user",
    };

    it("Comment is added to request", async () => {
        var result = await firestore.AddCommentToRequest(requestId, commentObj);
		expect(result).to.exist;
		expect(result.id).to.exist;
	});
	
	it("Result list length should be greater than 0 when calling GetCommentsFromRequest()", async () => {
        var result = await firestore.GetCommentsFromRequest(requestId);
        expect(result.length).to.be.greaterThan(0);
    });

});

describe("User profile functions", async () => {

	uid = '111222333444555666'
    var userObj = {
        FirstName: "John", 
		LastName: "Smith",
		SetupComplete: true,
		Roles:["Blogger", "Requester"],
        userName:"user"
    };
	
    it("User document can be added", async () => {
		var result = await firestore.AddUser(uid, userObj);
		should().exist(result._writeTime);
	});

	it("User profile can be updated", async () => {
		var updatedUserInfo = {
			FirstName: "Bob",
			LastName: "Smith",
			SetupComplete:true,
			Roles:["Requester"],
			userName: "Bob S"
		}
		var result = await firestore.UpdateUserProfile(uid, updatedUserInfo);
		should().exist(result._writeTime);

		var userDoc = await firestore.GetUserProfile(uid);
		expect(userDoc.data().FirstName).to.equal("Bob");
	});

	it("User roles can be updated", async () => {
		var newRoles = ["Blogger", "Requester", "Admin"];
		var result = await firestore.UpdateUserRoles(uid, newRoles);
		should().exist(result._writeTime);

		var userDoc = await firestore.GetUserProfile(uid);
		var docRoles = userDoc.data().Roles;
		for(var i=0; i<docRoles.length; i++){
			expect(docRoles[i]).to.equal(newRoles[i]);
		}
	});

	it("User document can be deleted", async () => {
		var result = await firestore.DeleteUser(uid);
		should().exist(result._writeTime);
		var userDoc = await firestore.GetUserProfile(uid);
		expect(userDoc.data()).to.be.undefined;
	});

});

describe("Zipcode_map functions", () => {
	var lat = 42.42;
	var long = -83.3;
	var zip = "48240";

	it("Result list length should be greater than 0 when calling GetZipDocuments()", async () => {
		var zipDocList = [];
		var collection = await firestore.GetZipDocuments();
		collection.forEach((doc) => {
			zipDocList.push(doc);
		 });
        expect(zipDocList.length).to.be.greaterThan(0);
	});

	it("Resulting id should equal given ID when calling GetZipDocument(id)", async () => {
        var result = await firestore.GetZipDocument(zip);
		expect(result.id).to.equal(zip);
	});
	
	it("Printer can be added and removed from coordinates", async () => {
		var zipDoc = await firestore.GetZipDocument(zip);
		var oldCount = zipDoc.data().count;

		await firestore.AddPrinterToCoordinates(lat, long, zip);
		var zipDoc = await firestore.GetZipDocument(zip);
		expect(zipDoc.data().count).to.equal(oldCount + 1);

		await firestore.RemovePrinterFromCoordinates(zip);
		var zipDoc = await firestore.GetZipDocument(zip);
		expect(zipDoc.data().count).to.equal(oldCount);
	});
});

describe("Communities Functions", () => {

    var communityObj = {
        description: "This is Group Z.", 
        homeCity:"Troy",
        imgLink:"", 
        name:"Group Z",
    };

    it("Community can be added and deleted", async () => {
        var result = await firestore.AddCommunity(communityObj);
		expect(result).to.exist;
		
		await firestore.DeleteCommunity(result);
		expect(await firestore.GetCommunity(result)).to.be.undefined;
	});

    it("Should return a document with an id matching the call", async () => {
        expect(
			(await firestore.GetCommunity("RkDqvUcnuHhbeWS4FgEw")).name)
			.to.equal("Group C");
	});
	
	it("Result list length should be greater than 0 when calling GetCommunities()", async () => {
        var result = await firestore.GetCommunities();
        expect(result.length).to.be.greaterThan(0);
    });

});


describe("BlogPosts", () => {

	uid = '111222333444555666';

	var userObj = {
		FirstName:"",
		LastName:"",
		Roles : [
			"Blogger",
			"Requester"
		]
	};

	var commObj = {
		descripton: "This is a test community",
		name: "Test Community"
	}

	var postObj = {
		title: "This is a test post",
		reviewDate: Date.now(),
		desc: "post desc",
		flagged : false
	};

	var secondPost = {
		title: "This is a test post",
		reviewDate: Date.now(),
		desc: "post desc",
		flagged : false
	};

	var commentObj= {
		numReplies : 0,
		commentDate: Date.now(),
		desc:"description"
	}

	var commId;
	var postRes;
	var secondPostRes;
	var commentRes;

	before(async () => {
		await firestore.AddUser(uid,userObj);
		commId = await firestore.AddCommunity(commObj);
		postObj.community = commId;
		postRes = (await firestore.AddPost(postObj)).id;
		secondPost.community = commId;
		secondPostRes = (await firestore.AddPost(secondPost)).id;
		commentObj.community = commId;
		commentObj.postId = postRes;
		commentRes = (await firestore.AddComment(commentObj)).id;

		console.log(commId);
		console.log(postRes);
	});

	after(async () => {
		
		await firestore.DeleteUser(uid);
		await firestore.DeleteCommunity(commId);
		await firestore.DeletePost(commId,postRes);
		await firestore.DeletePost(commId,secondPostRes);
		
		console.log("deleted");

	});

	describe("Get blog posts from community", () => {
		it("Get blog posts, non-flagged", async () =>{
			var results = await firestore.GetPostsFromCommunity(commId,false);
			console.log(results);
			expect(results.length).to.be.greaterThan(0);
		});
		it("Get flagged notes from blog post", async() =>{

			var date = new Date();
			var note = {};
			note.commentDate = date;
			note.uid = uid;
			note.userName = "name";

			await firestore.FlagBlogPost(commId,secondPostRes,note);
			var results = await firestore.GetPostsFromCommunity(commId,true);
			console.log(results);
			expect(results.length).to.be.greaterThan(0);
			
		});
		it("unflag blog post", async() => {
			var result = await firestore.UnflagBlogPost(commId,secondPostRes);
			var post = await firestore.GetBlogPost(commId, secondPostRes);
			if(post.flagged)
			post.flagged.should.be.false;
		});
		
	});


})


describe("Like functions", () => {

	uid = "111222333444555";

    var postObj = {
        body_text: "test comment", 
        commentDate: new Date(),
        uid:uid, 
        userName:"user",
	};

	var commObj = {
		descripton: "This is a test community",
		name: "Test Community"
	}

	var likeObj = {
		uid: uid,
	}

	var commentObj = {
		body_text: "Test comment",
		commentDate: new Date(),
		uid: uid,
		userName: "user name",
		numLikes: 0
	}

	var commId;
	var postId;
	var likeId = likeObj.uid;
	var commentId;

    it("Like is added to post", async () => {
		commId = await firestore.AddCommunity(commObj);
		postObj.community = commId;
		postId = (await firestore.AddPost(postObj)).id;
		likeObj.postId = postId;
		likeObj.commId = commId;
		var result = (await firestore.AddLikeToPost(likeObj))
		var likes = await firestore.GetLikesFromBlogPost(commId, postId);
		expect(likes.length).to.be.equal(1);
	});

	it("Get list of likes from blog post", async () => {
		var likes = await firestore.GetLikesFromBlogPost(commId, postId);
		expect(likes.length).to.be.greaterThan(0);
	});

	it("Like is removed from post", async () => {
		var result = (await firestore.RemoveLikeFromPost(commId, postId, likeId));
		var likes = await firestore.GetLikesFromBlogPost(commId, postId);
		expect(likes.length).to.be.equal(0);

		await firestore.DeletePost(postId, commId);
		await firestore.DeleteCommunity(commId);
	});

	it("Like is added to comment", async () => {
		commId = await firestore.AddCommunity(commObj);
		postObj.community = commId;
		postId = (await firestore.AddPost(postObj)).id;
		commentObj.community = commId;
		commentObj.postId = postId;
		commentId = (await firestore.AddComment(commentObj)).id;
		var result = (await firestore.AddLikeToComment(commId, postId, commentId, likeObj, likeObj, uid))
		var likes = await firestore.GetLikesFromComment(commId, postId, commentId);
		expect(likes.length).to.be.equal(1);
	});

	it("Get list of likes from comment", async () => {
		var likes = await firestore.GetLikesFromComment(commId, postId, commentId);
		expect(likes.length).to.be.greaterThan(0);
	});

	it("Like is removed from comment", async () => {
		var result = (await firestore.RemoveLikeFromComment(commId, postId, commentId, likeId, uid));
		var likes = await firestore.GetLikesFromComment(commId, postId, commentId);
		expect(likes.length).to.be.equal(0);

		await firestore.DeleteComment(postId, commId, commentId);
		await firestore.DeletePost(postId, commId);
		await firestore.DeleteCommunity(commId);
	});

});

describe("Post functions", () => {

	uid = "111222333444555";

    var postObj = {
        body_text: "test comment", 
        commentDate: new Date(),
        uid:uid, 
        userName:"user",
	};

	var commObj = {
		descripton: "This is a test community",
		name: "Test Community"
	}

	var commId;
	var postId;

	it("Get post", async () => {
		commId = await firestore.AddCommunity(commObj);
		postObj.community = commId;
		postId = (await firestore.AddPost(postObj)).id;
		
		var post = await firestore.GetBlogPost(commId, postId);
		expect(post.body_text).to.equal("test comment");
	});

    it("Update post", async () => {
		newPostObj = {
			body_text:"new comment",
			commentDate: new Date(),
			uid: uid,
			userName:"user",
			community: commId
		};

		var result = await firestore.UpdatePost(postId, newPostObj);
		expect(result._writeTime).to.exist;
		var post = await firestore.GetBlogPost(commId, postId);
		expect(post.body_text).to.equal("new comment");
	});

	it("Delete post", async () => {
		var result = await firestore.DeletePost(postId, commId);
		expect(result._writeTime).to.exist;

		var result = await firestore.GetBlogPost(commId, postId);
		expect(result).to.be.undefined;

		// Delete community too
		await firestore.DeleteCommunity(commId);
	});

});

describe("Favorite community functions", () => {

	uid = '111222333444555666';

	var userObj = {
		FirstName:"",
		LastName:"",
		Roles : [
			"Blogger",
			"Requester"
		]
	};

	var commObj = {
		descripton: "This is a test community",
		name: "Test Community"
	}

	var commId;
	var commResult;

	before(async () => {
		await firestore.AddUser(uid,userObj);
		commId = await firestore.AddCommunity(commObj);
	});

	after(async () => {
		await firestore.DeleteUser(uid);
		await firestore.DeleteCommunity(commId);

	});

	describe("Added favorites", () => {
		it("Community appears in user's favorites after it is favorited", async () => {
		
		

			var result = await firestore.AddFavorite(commId,uid);

			var userFavorites = await firestore.GetFavoritedCommunities(uid);
			expect(userFavorites.length).to.be.greaterThan(0);

			var favorited = false;
			userFavorites.forEach(async (favorite) =>  {
				if(favorite.id == commId)
				{
					favorited = true;
				}
			});

			expect(favorited).to.be.true;
		});
	});
	

	describe("Remove favorite", () => {
		it("Community favorite is removed from user", async () => {
			var result = await firestore.RemoveFavorite(commId, uid);

			var favorited = false;
			var userFavorites = await firestore.GetFavoritedCommunities(uid);
			userFavorites.forEach(async (favorite) =>  {
				console.log(favorite.id);
				if(favorite.id == commId)
				{
					favorited = true;
				}
			});

			expect(favorited).to.be.false;
		});
	});
	
});

describe("Comment replies", () => {
	uid = '111222333444555666';

	var userObj = {
		FirstName:"",
		LastName:"",
		Roles : [
			"Blogger",
			"Requester"
		]
	};

	var commObj = {
		descripton: "This is a test community",
		name: "Test Community"
	}

	var postObj = {
		title: "This is a test post"
	};

	var commentObj= {
		numReplies : 0,
		commentDate: Date.now(),
		desc:"description"
	}

	var commId;
	var postRes;
	var commentRes;

	before(async () => {
		await firestore.AddUser(uid,userObj);
		commId = await firestore.AddCommunity(commObj);

		postObj.community = commId;
		postRes = (await firestore.AddPost(postObj)).id;
		commentObj.community = commId;
		commentObj.postId = postRes;
		commentRes = (await firestore.AddComment(commentObj)).id;
	});

	after(async () => {
		await firestore.DeleteUser(uid);
		await firestore.DeleteCommunity(commId);
		await firestore.DeletePost(postRes,commId);

	});

	describe("Add to reply count", () => {
		it("reply count is increased", async () =>{
			var comments = (await firestore.GetCommentsFromBlogPost(commId,postRes,"newest"));
			var comment;
			 comments.forEach((doc) => {
				if(doc.id == commentRes){
					comment = doc;
				}
			 });

			var oldCount = comment.data().numReplies;
			var result = await firestore.AddToReplyCount(commId,postRes,commentRes);

			expect(result).to.be.greaterThan(oldCount);


		});
	});
});

describe("Printer Form Firestore Functions", async () => {

	uid = '111222333444555666';
	var formObj = {
		paypal_email: "TestPayPalEmail@gmail.com", 
		uid:uid,
		comment:"I really want it", 
		fName:"Bob",
		lName:"Jones",
		date: new Date(), 
		zipCode:'12345', 
		formRoles:[
			"Requester",
			"Blogger"
		]
	};

	var userObj = {
		FirstName:"",
		LastName:"",
		Roles : [
			"Blogger",
			"Requester"
		]
	};

	it("_writeTime should exist after BecomePrinterForm()", async () => {
		var result = await firestore.BecomePrinterForm(uid,formObj);
		
		should().exist(result._writeTime);
	});

	it("Result should be true when checking if the new printer form exists", async () => {
		var result = await firestore.BecomePrinterFormExist(uid);
		expect(result).to.be.true;
	});

	it("Result list length should be greater than 0 when calling GetBecomePrinterForms()", async () => {
		var result = await firestore.GetBecomePrinterForms();
		expect(result.length).to.be.greaterThan(0);
	});

	it("Document ID matches UID when GetBecomePrinterForm() is called", async () => {
		var result = await firestore.GetBecomePrinterForm(uid);
		expect(result.id).to.equal(uid);
	});

	it("Docuement is deleted after RemoveBecomePrinterForm()", async () => {
		var result = await firestore.RemoveBecomePrinterForm(uid);
		should().exist(result._writeTime);

		var readRes = await firestore.BecomePrinterFormExist(uid);
		expect(readRes).to.be.false;
	});

	it("User has the perma reject flag set after PermanentlyRejectFlag() called", async () => {
		await firestore.AddUser(uid,userObj);

		var result = await firestore.PermanentlyRejectFlag(uid);
		var user = await firestore.GetUserProfile(uid);
		var permaBanned = user.data().permanently_reject_become_printer;

		expect(permaBanned).to.be.true;

		await firestore.DeleteUser(uid);

	});


});