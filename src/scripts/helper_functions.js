
const statusDefs = {
    "Admin Review" : "1",
    "Admin Approved" : "2",
    "Claimed by Printer" : "3",
    "Admin Denied" : "4",
    "Awaiting Payment" : "5",
    "In Progress" : "6",
    "Disputed" : "7",
    "Completed" : "8",
    "Cancelled" : "9" 
}


exports.GetStatusName = function (statusNum)
{
    return Object.keys(statusDefs).find(key => statusDefs[key] === statusNum);
}