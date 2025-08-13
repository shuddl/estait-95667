OAUTH client info:
Client ID: 29afa25e-cce6-47ac-8375-2da7c361031a
Client Secret: t48/pe1i3uYKlSqwXv70bh91SgGFf9XhE2LKDnimEwI=
API URL
                            

https://sync.thewiseagent.com/http/webconnect.asp

                        
OAuth 2.0 Authentication
OAuth2.0 using the "authorization code" flow.

You will need an OAuth Client ID and Client Secret.

Please provide the following information:
Name of your Application
A publicly accessible URL to a logo
Redirect Domain for your application. Ex: acme.org
List of scopes to access. See scopes below
OAuth 2.0 Scopes
Wiseagent API supports the following scopes:

profile: Read profile information including Email, Name, Company
team: Read or Update inside team members / update inside team assignments
marketing: Read or Update marketing programs
contacts: Read, Update, or Create contacts.
properties: Read or Update properties.
calendar: Read or Update Calendar/Planner.

Retrieve access_token
Begin by sending a GET to https://sync.thewiseagent.com/WiseAuth/auth

Include the following query parameters:

client_id : Your OAuth Client ID
redirect_uri : The full URL to the endpoint which will receive an authorization code.
response_type : 'code' for authorization code flow.
scope : A space-delimited list of scopes to authorize.
Use the crafted URL to create a link or button within your application. Once clicked, an OAuth consent screen will appear. Users will have the ability to login to their Wise Agent account, view the data they are about to share with your app, and approve or deny individual scopes.

OAuth Consent Initial Screen OAuth Consent Login Screen OAuth Consent Permissions Screen

The entire sequence of events should look like this:
OAuth Consent Flow
Retrieve the authorization code at your redirect_uri
Example Request to be consumed by your endpoint at redirect_uri

                            

https://your-redirect-uri.com?code=AUTHORIZATION_CODE&expires_at=EXPIRATION_TIME&scope=SCOPES

                        
Query Parameters

code : The authorization code. This is the code you will use to exchange for an access_token.
expires_at : The time at which the authorization code will expire in UTC format.
scope : The scopes approved by the end user. Space-delimited
Exchange authorization code for access_token
Once the user has authorized your application, they will be redirected to the redirect_uri you provided in the previous step. The redirect_uri will receive a query parameter named code. This is the authorization code.

Send a POST request to https://sync.thewiseagent.com/WiseAuth/token

Be sure to send this request from your application server, and not a front-end application.
Include the following parameters as part of the body, in JSON format:

                            

{
"client_id": "Your_Client_ID",
"client_secret": "Your_Client_Secret",
"code": "The_Authorization_Code",
"grant_type": "authorization_code"
}

                        
Alternatively, the client_id and client_secret can be sent as an authorization header.

To generate this header, concatenate client_id and client_secret and encode with Base64. Ex: Base64Encode(client_id + ':' + client_secret)

                            

Authorization: Basic Base64EncodedCredentials

                        
Example Response:

                            

{
"access_token": "Your_Access_Token",
"expires_at": "2020-01-01T00:00:00.000Z",
"refresh_token": "Your_Refresh_Token",
}

                        
Making API Requests with OAuth 2.0
Example:

Requests to the API require authentication. When the request is made, the following header should be provided, replacing "access_token" with the access token retrieved in the previous step. If this authorization header isn't provided, the request will fail.

                            

Authorization: Bearer access_token

                        
In the event that an access_token is expired, the following response will be received along with a 401 Unauthorized status code.

                            

{
"error": "invalid_grant",
"error_description": "The token has expired"
}

                        
Refresh the token by sending a POST to https://sync.thewiseagent.com/WiseAuth/token with the following parameters.

                            

{
"grant_type": "refresh_token",
"refresh_token": "Your_Refresh_Token",
}

                        
The response will be the same as the previous /token response.

Disconnect OAuth 2.0 Apps
Send a POST request to https://sync.thewiseagent.com/WiseAuth/revoke

Include the following parameters as part of the body, in x-www-form-urlencoded format:

                            

token="Your_Access_Token"
token_type_hint="access_token|refresh_token"

                        
Revoking a refresh token does not immediately disconnect the app, but it disables the capability to refresh an expired access token.

Revoking an access token instantly revokes access.

Accept & Content-Type Headers
Add an 'Accept' header of application/json to the request.

                            

Accept: application/json

                        
Add a 'Content-Type' header of application/x-www-form-urlencoded to the request.

                            

Content-Type: application/x-www-form-urlencoded

                        
Example cURL Request
Replace [access_token] with token from OAuth Authentication

                            

curl --location --request POST 'https://sync.thewiseagent.com/http/webconnect.asp?requestType=webcontact' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Authorization: Bearer [access_token]' \
--header 'Accept: application/json' \
--data-urlencode 'CFirst=John' \
--data-urlencode 'CEmail=john@example.com' \
--data-urlencode 'Source=API' \
--data-urlencode 'CLast=BECKER' \
--data-urlencode 'address=11657 E Carol Ave' \
--data-urlencode 'city=Scottsdale' \
--data-urlencode 'state=AZ' \
--data-urlencode 'zip=85259' \
--data-urlencode 'country=USA' \

                        
getUser
Required OAuth scopes: 'profile'

Create a request including the following parameters using http GET to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getUser"

                        
returns

                            

"[ {"First": string, "Last": string, "Email": string} ]"

                        
getTeam
Required OAuth scopes: 'team'

Use this call to retrieve a json list of team members.

Submit following fields using http GET to:
https://sync.thewiseagent.com/http/webconnect.asp

The returned attribute InsideTeamId can be used to assign leads via "webcontact" request.

                            

requestType = "getTeam"

                        
returns

                            

[{"InsideTeamId":1,"Name":"Team Member Name", "Phone":"123-456-7890", "Cell":"123-456-7891", "Email":"agent@wiseagent.com", "JobTitle":"Broker"}]

                        
getOutsideTeam
Required OAuth scopes: 'team'

Use this call to retrieve a json list of outside team members. the value can be used in the OutsideTeamAssignment field in the webcontact method.

submit following fields using http GET to:
https://sync.thewiseagent.com/http/webconnect.asp

Returned
Email
can be used to assign leads via "webcontact" request.

                            

requestType = "getOutsideTeam"

                        
returns

                            

[{"TeamMember": "Team MemberName","Email": "agent@wiseagent.com","Cell": "123-456-7891","Phone": "123-456-7891"}]

                        
calls
Required OAuth scopes: 'contacts'

Create a request including the following parameters using http GET to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "calls"
callId = integer (unique identifier) - required if "clientId" not sent - will return specific call
clientId = integer/string - required if "callId" not sent - will return list of calls of contact. Prepend with "V" for vendors.

page = integer
page_size = integer
orderByNextContactDate = true - if true, will return list ordering by Next Contact Date Desc (otherwise date created asc)

                        
returns

                            

{

"Data": [{
"CallId": "11598",
"Completed": "false",
"FlagImportant": "true",
"Reason": "",
"AssignedTo": "Team Member Name",
"InsideTeamId": ""
"DateAdded": "7/20/2020 7:00:00 AM UTC",
"NextContactDate": "7/20/2020 6:03:36 PM",
"ClientId": "234",
"CallType": ""
}]
}

                        
getSingleContact
Required OAuth scopes: 'contacts'

submit the following parameters using http GET to https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getSingleContact"
clientID = clientID of contact in Wise Agent you wish to retrieve information for. Prepend with 'V' for vendors

                        
returns (for clients)

                            


[{
"ClientID": 1822535,
"CFirst": "",
"CLast": "",
"Title": "",
"Categories": "[{\"name\":\"02 Trial\"},{\"name\":\"100 Top PAST Clients - Magazine List\"}]",
"InsideTeamAssignment": "[{\"InsideTeamId\":1},{\"InsideTeamId\":98}]",
"OutsideTeamAssignment": "[{\"TeamMember\":\"Team
Wise
Agent\",\"LeadStatus\":\"assigned\",\"Cell\":\"480-836-0345\",\"Phone\":\"4808360345\",\"Email\":\"team@email.com\"}]",
"ContactUrl":"https://thewiseagent.com/secure/client/summary?clientId=1234",
"HomePhone": "",
"MobilePhone": "",
"WorkPhone": "",
"SpouseFirst": "",
"SpouseLast": "",
"CEmail": "",
"Company": "",
"AddressStreet": "",
"Source": "",
"AddressNumber": "",
"SuiteNo": "",
"County": "",
"City": "",
"State": "",
"Zip": "",
"POBox": "",
"Country": "",
"Rank": "Unranked",
"Status": null,
"DtUpdated": null,
"DateUpdatedUTC": null,
"DateAddedUTC": null,
"LastContactDate": null,
"DateMet": null,
"Birthday": null,
"Anniversary": null,
"HomeSaleAnniversary": null,
"CustomData": "[{\"Key\":\"CustomField1\",\"Value\":\"CustomValue1\"}]"
"Website": "",
"SpouseWebsite": "",
"PreferredPhone": "'Home Phone', 'Work Phone', OR 'Cell Phone'",
"SpousePreferredPhone": "'Home Phone', 'Work Phone', OR 'Cell Phone'"
}]


                        
returns (for vendors)

                            


[
{
"VendorID":"V26855",
"Company":"Wise Agent",
"ContactName":"Bill Contact",
"AlternateContact":"Jill Contact",
"Address":"281 E. 56th st",
"City":"Scottsdale",
"State":"AZ",
"Zip":"11111",
"Phone":"",
"ContactPhone":"111-111-1111",
"Fax":"",
"Email":"billcontact@wiseagent.com",
"Url":"https://www.wiseagent.com",
"Type":"Cooperating-Agent"
}
]


                        
Rank Values

                            

"A", "B", "C", "D", "F", "Unranked"

                        
Status Values

                            

"New","Attempted","Contacted","Active","Future Opportunity", "Disqualified","Bad Lead","Closed","No Status","Inactive","Under Contract","Hot Lead","Warm Lead","Appointment Set","Showing Homes","Submitted Offers","Nurture","Rejected","Met with Client","Listing Agreement","Active Listing"

                        
getCalendar
Required OAuth scopes: 'calendar'

submit following parameters using http GET to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getCalendar"
startDate* = "MM/DD/YYYY HH:mm" or "YYYY-MM-DD HH:mm" - 24 hour AZ timezone Start date of calendar events *Required
endDate* = "MM/DD/YYYY HH:mm" or "YYYY-MM-DD HH:mm" - 24 hour AZ timezone End date of calendar events *Required

                        
Notice: All repeating type events are expanded into single instances of events.

returns

                            

[{
"PlannerID": 269399,
"Subject": "Early Morning Meeting",
"Memo": null,
"StartDate": "5/14/2024 10:00:00 AM",
"EndDate": "5/14/2024 10:30:00 AM",
"AllDayEvent": false,
"Completed": false,
"EventColor": "",
"EventIcon": "",
"location": "",
"InsideTeamID": 0,
"Attendees": "C1234,C4567"
}]

                        
Attendees are a comma separated list of ClientIDs. These can be used to assign events to contacts. They are prepended with a letter 'C' to signify clients, or a 'V' for vendors

getContactsCount
Required OAuth scopes: 'contacts'

submit following parameters using http GET to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getContactsCount"
dtupdated = "MM/DD/YYYY HH:mm" or "YYYY-MM-DD HH:mm" - 24 hour AZ timezone (not required) will return contacts updated since date given
DateUpdatedUTC = "MM/DD/YYYY HH:mm" or "YYYY-MM-DD HH:mm" - 24 hour time UTC (not required) will return contacts updated since date given as UTC
sources = "Zillow,Trulia" comma delimited sources are accepted and return "or" results

                        
The following are query parameters that will be considered exclusively (i.e. if 'email' and 'phone' params are sent, only 'email' will be applied to the query.

                            

email = "email@email.com" * date parameters will be disregarded
phone = numeric only "4808360345" * date parameters will be disregarded
categories = "my contact" comma delimited categories are accepted and return "or" results, unless sending "categoryAll" param as true.
categoryAll = true will take sent categories and apply an "AND" filter
nameQuery = "John" will check contacts' First, Last, and Company to see if either is similar to search param

                        
returns

                            

{"count":154102}

                        
getContacts
Required OAuth scopes: 'contacts'

Submit following parameters using http GET to https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getContacts"
dtupdated = "MM/DD/YYYY HH:mm" or "YYYY-MM-DD HH:mm" - 24 hour AZ timezone (not required) will return contacts updated since date given
DateUpdatedUTC = "MM/DD/YYYY HH:mm" or "YYYY-MM-DD HH:mm" - 24 hour time UTC (not required) will return contacts updated since date given as UTC
sources = "Zillow,Trulia" comma delimited sources are accepted and return "or" results

                        
The following are query parameters that will be considered exclusively (i.e. if 'email' and 'phone' params are sent, only 'email' will be applied to the query.

                            

email = "email@email.com" * date parameters will be disregarded
phone = numeric only "4808360345" * date parameters will be disregarded
categories = "my contact" comma delimited categories are accepted and return "or" results, unless sending "categoryAll" param as true.
categoryAll = true will take sent categories and apply an "AND" filter
nameQuery = "John" will check contacts' First, Last, and Company to see if either is similar to search param

                        
Paging:
Use paging to return batches of contacts.
                            

page = number (starts with 1) * if sent default "page_size" will be 100 contacts. Use with "getContactsCount" to find how many requests might need to be made.
page_size = number * how many contacts per page".

                        
returns

                            


[{
"ClientID": 1822535,
"CFirst": "",
"CLast": "",
"Title": "",
"Categories": "[{\"name\":\"02 Trial\"},{\"name\":\"100 Top PAST Clients - Magazine List\"}]",
"InsideTeamAssignment": "[{\"InsideTeamId\":1},{\"InsideTeamId\":98}]",
"OutsideTeamAssignment": "[{\"TeamMember\":\"Team
Wise
Agent\",\"LeadStatus\":\"assigned\",\"Cell\":\"480-836-0345\",\"Phone\":\"4808360345\",\"Email\":\"team@email.com\"}]",
"ContactUrl":"https://thewiseagent.com/secure/client/summary?clientId=1234",
"HomePhone": "",
"MobilePhone": "",
"WorkPhone": "",
"SpouseFirst": "",
"SpouseLast": "",
"CEmail": "",
"Company": "",
"AddressStreet": "",
"Source": "",
"AddressNumber": "",
"SuiteNo": "",
"County": "",
"City": "",
"State": "",
"Zip": "",
"POBox": "",
"Country": "",
"Rank": "Unranked",
"Status": null,
"DtUpdated": null,
"DateUpdatedUTC": null,
"DateAddedUTC": null,
"LastContactDate": null,
"DateMet": null,
"Birthday": null,
"Anniversary": null,
"HomeSaleAnniversary": null,
"CustomData": "[{\"Key\":\"CustomField1\",\"Value\":\"CustomValue1\"}]"
"Website": "",
"SpouseWebsite": "",
"PreferredPhone": "'Home Phone', 'Work Phone', OR 'Cell Phone'",
"SpousePreferredPhone": "'Home Phone', 'Work Phone', OR 'Cell Phone'"
}]


                        
Rank Values

                            

"A", "B", "C", "D", "F", "Unranked"

                        
Status Values

                            

"New","Attempted","Contacted","Active","Future Opportunity", "Disqualified","Bad Lead","Closed","No Status","Inactive","Under Contract","Hot Lead","Warm Lead","Appointment Set","Showing Homes","Submitted Offers","Nurture","Rejected","Met with Client","Listing Agreement","Active Listing"

                        
getClientAddresses
Required OAuth scopes: 'contacts'

submit following fields using http GET to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getClientAddresses"
ClientID = clientID of contact in Wise Agent you wish to retrieve information for

                        
These are 'extra' addresses. The client's primary address can be retrieved from the getSingleContact or getContacts request types.

returns

                            

[{
"ClientAddressID": 539291,
"ClientID": 88495232,
"AddressType": "Business",
"AddressNum": "5636",
"Address": "E McDowell Rd",
"SuiteNo": "",
"POBox": "",
"BldgFloor": "",
"City": "Phoenix",
"State": "AZ",
"Zip": "85008",
"County": "",
"Country": "United States",
"MLS": "",
"Subdivision": null,
"Township": null
}]

                        
getAllCategoriesWithCount
Required OAuth scopes: 'contacts'

Create a request including the following parameters using http GET to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getAllCategoriesWithCount"

                        
returns

                            

{"CategoryInfo":[{"name":"1213","id":10851,"clientCount":0},
{"name":"1234","id":11017,"clientCount":6},{"name":"Alec GreenE","id":11007,"clientCount":0}]}

                        
getCategoryClientCount
Required OAuth scopes: 'contacts'

submit following fields using http GET to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getCategoryClientCount"
category = name of category that you want the client count for

                        
returns

                            

"[{"success": "true", "categorycount": 7}]"

                        
getVendors
Required OAuth scopes: 'contacts'

Submit following parameters using http GET to https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getVendors"

                        
The following are query parameters that will be considered exclusively (i.e. if 'email' and 'phone' params are sent, only 'email' will be applied to the query.

                            

email = "email@email.com"
phone = "4808360345"
types = "Cooperating-Agent" comma delimited types
nameQuery = "Bill Contact" will check Company name, Contact name, & Alternate Contact Name

                        
Paging:
Use paging to return batches of contacts.
                            

page = number (starts with 1) * if sent default "page_size" will be 100 contacts. Use with "getContactsCount" to find how many requests might need to be made.
page_size = number * how many contacts per page".

                        
returns

                            


[
{
"VendorID":"V26855",
"Company":"Wise Agent",
"ContactName":"Bill Contact",
"AlternateContact":"Jill Contact",
"Address":"281 E. 56th st",
"City":"Scottsdale",
"State":"AZ",
"Zip":"11111",
"Phone":"",
"ContactPhone":"111-111-1111",
"Fax":"",
"Email":"billcontact@wiseagent.com",
"Url":"https://www.wiseagent.com",
"Type":"Cooperating-Agent"
}
]


                        
Common 'Type' Values

                            

Appraisal
Cooperating-Agent
Home-Inspection
Homeowners-Insurance
Home-Warranty
Mortgage
Pest-Inspection
Title
Seller
Buyer
Other

                        
getProperty
Required OAuth scopes: 'properties'

Submit following parameters using http GET to https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getProperty"
propertyID = Numeric ID of a property
StreetNum = Street Number
Street = Street Name
State = Region/State
PostalCode = Postal/ZIP Code
MLS = MLS Number

                        
Note: if propertyID is not supplied, then at least one of the remaining fields must be supplied.

returns

                            


{
"PropertyID": "12434",
"StreetNum": "13400",
"Street": "E Shea Blvd",
"City": "",
"State": "",
"PostalCode": "",
"Subdivision": "",
"County": "",
"POBox": "",
"Country": "",
"Suite": "",
"WebLink":"",
"LotNum": "",
"MLS": "",
"primaryPhoto": URL,
"Details": {
"ListingPrice": int,
"LastSalePrice": int,
"YearBuilt": "",
"TaxesAnnual": "",
"HOAAnnual": "",
"NumBedrooms": "",
"NumBathrooms": "",
"NumHalfBathrooms": "",
"SquareFt": "",
"LotSize": "",
"DateListed": "MM/DD/YYYY",
"PropertyType": "",
"ListingStatus": "",
"DiningRooms": "",
"DiningRoomDesc": "",
"LivingRooms": "",
"LivingRoomDesc": "",
"InteriorFeaturesDesc": "",
"ExteriorFeaturesDesc": "",
"StyleDesc": "",
"DesignDesc": "",
"Fireplaces": "",
"Stories": "",
"Garage": "",
"AgentName": "",
"AgentPhone": "",
"AgentEmail": "",
"AgentID": "0",
"BrokerName": "",
"BrokerEmail": "",
"BrokerPhone": "",
"OfficeName": "",
"OfficeEmail": "",
"OfficePhone": "",
"OfficeID": "0",
"FranchiseName": "",
"FranchiseEmail": "",
"FranchisePhone": "",
"Description": "",
"SchoolDistrict": "",
"Township":"",
"BuyerAgent_Commission":"",
"BuyerAgent_Concession":"",
"SellerAgent_Commission":"",
"SellerAgent_Concession":""
}
}


                        
returns on error

                            


{"status":"error","data":{"message": "Property ID 79899 Does not exist"}}


                        
getProperties
Required OAuth scopes: 'properties'

Submit following parameters using http GET to https://sync.thewiseagent.com/http/webconnect.asp

Use showArchived=true to list only archived properties, otherwise, only non-archived properties are returned

                            

requestType = "getProperties"
showArchived = "true" or "false" (default false)
page = number (starts with 1) * Default "page" will be 1, if ommitted - ordered by most recent.
page_size = number * how many properties per page. Default "page_size" will be 50 properties, if ommitted.

                        
returns

                            


[{
"PropertyID": "12434",
"StreetNum": "13400",
"Street": "E Shea Blvd",
"City": "",
"State": "",
"PostalCode": "",
"Subdivision": "",
"County": "",
"POBox": "",
"Country": "",
"Suite": "",
"WebLink":"",
"LotNum": "",
"MLS": "",
"primaryPhoto": URL,
"Details": {
"ListingPrice": int,
"LastSalePrice": int,
"YearBuilt": "",
"TaxesAnnual": "",
"HOAAnnual": "",
"NumBedrooms": "",
"NumBathrooms": "",
"NumHalfBathrooms": "",
"SquareFt": "",
"LotSize": "",
"DateListed": "MM/DD/YYYY",
"PropertyType": "",
"ListingStatus": "",
"DiningRooms": "",
"DiningRoomDesc": "",
"LivingRooms": "",
"LivingRoomDesc": "",
"InteriorFeaturesDesc": "",
"ExteriorFeaturesDesc": "",
"StyleDesc": "",
"DesignDesc": "",
"Fireplaces": "",
"Stories": "",
"Garage": "",
"AgentName": "",
"AgentPhone": "",
"AgentEmail": "",
"AgentID": "0",
"BrokerName": "",
"BrokerEmail": "",
"BrokerPhone": "",
"OfficeName": "",
"OfficeEmail": "",
"OfficePhone": "",
"OfficeID": "0",
"FranchiseName": "",
"FranchiseEmail": "",
"FranchisePhone": "",
"Description": "",
"SchoolDistrict": "",
"Township":"",
"BuyerAgent_Commission":"",
"BuyerAgent_Concession":"",
"SellerAgent_Commission":"",
"SellerAgent_Concession":""
}
},
...
]


                        
getPropertySearchCriteria
Required OAuth scopes: 'properties'

Submit following parameters using http GET to https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getPropertySearchCriteria"
SearchID = SearchID supplied from 'getPropertySearchCriteriaList'

                        
returns

                            


{
"propCity": "Mesa",
"propZip": "85212",
"propType": "Residential",
"propArea": "Highland Ridge",
"propNotes": "Extra Notes",
"minPrice": 100000,
"maxPrice": 200000,
"propBath": 2,
"propBed": 2,
"propRentOwn": "",
"propMoving": 3,
"propSqft": 0
}


                        
If no PropertySearchCriteria was found for this searchID, an empty object will be returned

                            

{}

                        
getPropertySearchCriteriaList
Required OAuth scopes: 'properties'

Submit following parameters using http GET to https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getPropertySearchCriteriaList"
clientID = ClientID supplied from 'getContacts'

                        
returns

                            


{
"propertySearchCriteria": [
{
"SearchID": "1234",
"propCity": "Mesa",
"propZip": "85212",
"propType": "Residential",
"propArea": "Highland Ridge",
"propNotes": "Extra Notes",
"minPrice": 100000,
"maxPrice": 200000,
"propBath": 2,
"propBed": 2,
"propRentOwn": "",
"propMoving": 3,
"propSqft": 0
}
]
}


                        
If no PropertySearchCriteria was found for this ClientID, an empty array will be returned

                            

{
"propertySearchCriteria": []
}

                        
getContactNotes
Required OAuth scopes: 'contacts'

Submit following parameters using http GET to https://sync.thewiseagent.com/http/webconnect.asp

Number of notes returned will be 100, unless specified with paging params

                            

requestType = "getContactNotes"
ClientID = clientID of contact in Wise Agent. Prepend with 'V' for vendors.
NoteID = Unique identifier for a single contact note.
categories = Comma-separated list of category names, e.g. 'Calllist' OR 'Buyer' OR 'Calllist,Buyer' (not required) will return all contact notes if omitted
subject = Note Subject(not required)
date = MM/DD/YYYY" or "YYYY-MM-DD(not required) will return notes written on this date

                        
Paging:
Use paging to return batches of contact notes.
                            

page = number (starts with 1) * Default "page" will be 1, if ommitted.
page_size = number * how many notes per page. Default "page_size" will be 100 notes, if ommitted.

                        
returns

                            


[{
"NoteID":640318,
"ClientID":1855159,
"Subject":"String",
"Note":"String", //Note content (can contain HTML)
"NoteDate":"11/2/2020 1:42:00 PM",
"Locked":0,
"LockDate":null,
"insideteamid":0, //Note added by inside team member. 0 = All
"Categories":"[{\"tagName\":\"buyer\",\"name\":\"Buyer\",\"catID\":292}]"
}]


                        
getPrograms
Required OAuth scopes: 'marketing'

Create a request including the following parameters using http GET to https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getPrograms"

                        
returns

                            

"[ {"ProgramName": "Web Auto Email Campaign", "ProgramID": "234"},{"ProgramName": "Web New Buyer Email Campaign", "ProgramID": "235"} ]" “[]" = no programs returned

                        
getTransactionNames
Required OAuth scopes: 'marketing'

submit following fields using http GET to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getTransactionNames"

                        
returns

                            

"[{"CLName":"Name of Transaction","CLDataID":ID,"deleted": (1 for deleted, 0 for not deleted), "Completed": (1 or 0), "CompletedDate":"1/1/1900"}]"

                        
getTransactionNotes
Required OAuth scopes: 'marketing'

submit following fields using http GET to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getTransactionNotes"
transactionID = ID of the transaction in Wise Agent, from getTransactionNames request

                        
returns

                            

"{Notes: [{"NoteMemo":"note text","NoteDate":"date of note"}]"

                        
getLoginToken (SSO)
Required OAuth scopes: 'profile'

Create a request including the following parameters using http GET to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getLoginToken"

                        
returns

                            

https://www.thewiseagent.com/secure/login_secure?accesstoken=(temporary access token) this link expires in 60 seconds

                        
* You can send a "page" query parameter to send user to page. It must include full URI

Ex: https://www.thewiseagent.com/secure/login_secure?accesstoken=(temporary access token)&page=https://thewiseagent.com/secure/user/integrationsmenu.asp

getSources
Required OAuth scopes: 'contacts'

Create a request including the following parameters using http GET to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "getSources"

                        
returns

                            

"[ {"ID": integer, "Name": "234"} ]"

                        
tasks
Required OAuth scopes: 'team'

Create a request including the following parameters using http GET to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "tasks"
page = integer
page_size = integer - defaults to 100

                        
returns

                            

{
"Page": 1,
"TotalCount": 1,
"Data": [{
"TaskID": "11598",
"TaskDue": "",
"Completed": "false",
"Priority": "",
"Description": "Task",
"AssignedTo": "",
"InsideTeamId":"1",
"DateCreated": "7/20/2020 7:00:00 AM",
"DateModified": "7/20/2020 6:03:36 PM",
"EstimatedTime": "",
"CompletedDate": "1/1/1900 7:00:00 AM",
"ContactID": "0"
}]
}

                        
Content Categories
Required OAuth scopes: 'contacts'

Create a request including the following parameters using http GET to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "ContentCategories"

                        
returns

                            

{
"data": [
{
"Category": "Buyer tools"
},
{
"Category": "dff"
},
{
"Category": "Prospecting"
}
]
}


                        
Content
Required OAuth scopes: 'marketing'

Create a request including the following parameters using http GET to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "Content"
ContentId = integer (include to receive the Html component, fetches single record.)
Category = string (include to receive only content with requested category.)

                        
returns

                            

{
“data”: [{
“Id”: “123”,
“Name”: “Buyer 01”,
“Category”: “Buyer”,
“Subject”: “5 Musts When Buying a New Home”,
“Html”: “<h1>5 Things You Should Do Today</h1>” (only included if fetching single record)
}, {
“Id”: “124”,
“Name”: “Buyer 02”,
“Category”: “Buyer”,
“Subject”: “How To Get the Lowest Rate Possible”,
“Html”: “<h1>Don't Forget These 5 Things</h1>”
}, {
“Id”: “125”,
“Name”: “Seller 01”,
“Category”: “Seller”,
“Subject”: “Maximize the Selling Potential of Your Home”,
“Html”: “<h1>5 Simple Steps To Increase Value</h1>”
}]
}


                        
Web Hooks
Required OAuth scopes: 'profile'

Create a request including the following parameters using http GET to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "webhooks"

                        
returns

                            

{
“Data”: [{
“WebhookID”: “123”,
“EventType”: “contactCreate”,
“Status”: “Active”,
“Url”: “https://yourendpoint.com/handler/”
}, {
“WebhookID”: “124”,
“EventType”: “contactUpdate”,
“Status”: “Active”,
“Url”: “https://yourendpoint.com/handler/”
}, {
“WebhookID”: “125”,
“EventType”: “contactDelete”,
“Status”: “Disabled”,
“Url”: “https://yourendpoint.com/handler/"
}]
}


                        
register
Not Available for OAuth requests.

Submit a request for the register API docs by contacting your Wise Agent support contact.

Items to include in your request:
Authentication Token

A Promo Code you would like to use for this registration

Add Contact
Required OAuth scopes: 'contacts'

Important!
Categories and Source are important for segmenting and organizing contacts.

Sources are particularly essential for automation, as they enable distinct triggers to be set up based on the origin of each contact. For instance, if your platform has multiple pages where leads can inquire, each page should have a unique source assigned. This ensures that Wise Agent users can tailor their automation processes to suit the specific needs of different contact types, such as buyers or sellers, based on the source.

webcontact:
submit following fields using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "webcontact"
CFirst: first name *required
CLast: last name *required
CEmail: email
HomePhome: home phone
Fax: fax
MobilePhone: mobile phone
WorkPhone: work phone
Company: company
AddressNumber: home street number
AddressStreet: home street name
SuiteNo: home suite Number
City: home city
State: home state
zip: home zip
country: home country
Website: website
Rank: contact rank
ContactStatus: contact status
Source: source *required
Categories: category(semicolon;delimited no spaces)
InsideTeamId: team member assignment (retrieved from getTeam request)
OutsideTeamAssignment: outside team member's email address for lead assignment (retrieved from getOutsideTeam request)
calltype: 1 for phone, 2 for email, used for call list.defaults to 2 if phone not present
CommaDelimitedFormFields: ex. "bedrooms,bathrooms,sqft" will pull the querystring value of listed fields and drop them into the extra details.
Price: price of interested home (lead distribution rule)

                        
To record the property they are viewing, other than their home address, add the following fields. (This will appear in the additional properties section of the client summary. Do not include above property fields in request with same property information)

                            

paddress
pcity
pstate
pzip
pSuiteNo
pPOBox
pBldgFloor
pCounty
pCountry
pMLS

                        
To record a Property Search Profile include the following form-urlencoded fields (Users are able to search contacts for similar Property Search Profiles )

                            

propInfo=1 *required
propInfoCity
propInfoZip *int
propInfoPropType = [[residential,commercial,ect]]
propInfoArea = [[land area]] *int
propInfoNotes = [[extra notes]]
propInfoMinPrice *int
propInfoMaxPrice *int
propInfoMinBaths *int
propInfoMinBeds *int
propInfoRentOwn = [[rent or own]]
propInfoMoving = [[timespan in months (ex. "3")]] *int
propInfoSqft = [[building sqft]] *int

                        
returns

                            

{ "success" : "true", "data" : { "ClientID" : 1854784, "NewContact" : true } }

                        
If 'OutsideTeamAssignment' is supplied as a valid outside team member's email address, the lead rules on their account will be enacted (according to the supplied Source), bypassing any lead capture rules which may have been configured for the main account.

In the case an Outside team assignment was successful, the endpoint will also return an OutsideTeamAssignment object. The full response:

                            

{"success": "true","data":{"ClientID": 1832247,"NewContact":true, "OutsideTeamAssignment": { "TeamMember": "Team MemberName", "leadStatus": "accepted" , "Cell": "(123)456-7890" , "Phone" : "(123)456-7890" , "Email" : "agent@wiseagent.com" , "ClientID": 1882108} }}

                        
If a contact already exists, we do not update the contact. We will, though, add phone numbers and emails.

                            

{ "success" : "true", "data" : { "ClientID" : 1854784, "NewContact" : false, "Message": "Use 'updateContact' request to update contacts." } }

                        
updateContact
Required OAuth scopes: 'contacts'

submit following fields using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

All parameters concerning contact information are optional and any can be omitted

                            

requestType = "updateContact"
clientID = clientID of contact in Wise Agent
CFirst = updated value for first name
Clast = updated value for last name
CEmail = updated value for email
HomePhone = updated value for home phone number
MobilePhone = updated value for mobile phone number
WorkPhone = updated value for work phone number
Company = updated value for company
SuiteNo = updated value for home suite/apartment number
City = updated value for home city
State = updated value for home state
Zip = updated value for home zip
County = updated value for home county
Country = updated value for home country
AddressNumber = updated value for home street number
AddressStreet = updated value for home street name
Subdivision = updated value for home subdivision
BuildingFloor = updated value for home building floor

ContactStatus = one of the below Status Values
Rank = one of the below Rank Values

InsideTeamId = team member assignment (retrieved from getTeam request)
Reassignment = boolean (will remove other inside team assignments and assign to accompanied InsideTeamID request)

OutsideTeamAssignment = outside team member's email address for lead assignment (retrieved from getOutsideTeam request)

RemoveCategories = csv of categories (ex. "New Lead,Prospect")
AddCategories = csv of categories (ex. "New Lead,Prospect")

                        
Rank Values

                            

"A", "B", "C", "D", "F", "Unranked"

                        
Status Values

                            

"New","Attempted","Contacted","Active","Future Opportunity", "Disqualified","Bad Lead","Closed","No Status","Inactive","Under Contract","Hot Lead","Warm Lead","Appointment Set","Showing Homes","Submitted Offers","Nurture","Rejected","Met with Client","Listing Agreement","Active Listing"

                        
To record a Property Search Profile include the following form-urlencoded fields: (Users are able to search contacts for similar Property Search Profiles)

                            

propInfo=1 *required
propInfoCity
propInfoZip *int
propInfoPropType = [[residential,commercial,ect]]
propInfoArea = [[land area]] *int
propInfoNotes = [[extra notes]]
propInfoMinPrice *int
propInfoMaxPrice *int
propInfoMinBaths *int
propInfoMinBeds *int
propInfoRentOwn = [[rent or own]]
propInfoMoving = [[timespan in months (ex. "3")]] *int
propInfoSqft = [[building sqft]] *int

                        
returns on success

                            

"{"Success":"{clientID} updated"}"

                        
returns on error

                            

"{"Error":"Invalid Field {fieldName} - {clientID} not updated"}"
"{"Error":"Missing ClientID"}"

                        
addContactNote
Required OAuth scopes: 'contacts'

submit following fields using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "addContactNote"
note = text of note to add
subject = subject of note to add
categories = comma separated string of categories to categorize note by
clientids = comma separated string of client or vendor ids (passed with the getContacts/getVendors methods)
InsideTeamId = InsideTeamID of an inside team member. (retreive team via GET requestType="getTeam")

                        
returns

                            

"[{"success": "true","data": [{"ClientID": 1882131,"NoteID": 663505}]}]"

                        
addClientAddress
Required OAuth scopes: 'contacts'

submit following fields using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "addClientAddress"
ClientID = clientID of contact in Wise Agent
AddressType = type of address
AddressNum = street number *required
Address = street name *required
SuiteNo = suite/apartment number
POBox = PO Box
BldgFloor = building floor
Subdivision = subdivision
City = city
State = state
Zip = zip
County = county
Country = country
MLS = MLS
Township = Township

                        
returns

                            

{"success": true, "ClientAddressID": 539294}

                        
addClientsToCategory
Required OAuth scopes: 'contacts'

submit following fields using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "addClientsToCategory"
category = name of category to add
clientids = comma separated string of clientids (passed with the getContacts method)

                        
returns

                            

"[{"success": "true"}]"

                        
addClientsToMarketingProgram
Required OAuth scopes: 'marketing'

submit following fields using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "addClientsToMarketingProgram"
clientids = comma separated string of clientids (passed with the getContacts method)
programID = ID of Marketing Program for which to add clients to

                        
returns

                            

"[{"success": "true"}]"

                        
removeClientsFromCategory
Required OAuth scopes: 'contacts'

submit following fields using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "removeClientsFromCategory"
category = name of category to remove
clientids = comma separated string of clientids (passed with the getContacts method)

                        
returns

                            

"[{"success": "true"}]"

                        
addPropertySearchCriteria
Required OAuth scopes: 'properties'

submit following form-urlencoded fields using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp
Users are able to search contacts for similar Property Search Profiles

                            

requestType = "addPropertySearchCriteria"
clientid = [[previously retrieved clientid]] *required
propInfo=1 *required
propInfoCity
propInfoZip *int
propInfoPropType = [[residential,commercial,ect]]
propInfoArea = [[land area]] *int
propInfoNotes = [[extra notes]]
propInfoMinPrice *int
propInfoMaxPrice *int
propInfoMinBaths *int
propInfoMinBeds *int
propInfoRentOwn = [[rent or own]]
propInfoMoving = [[timespan in months (ex. "3")]] *int
propInfoSqft = [[building sqft]] *int

                        
returns

                            

"{"success": "property search profile added"},{"clientid": "1074010", "searchID": "1234"}"

                        
addClientAddress
Required OAuth scopes: 'contacts'

submit following form-urlencoded fields using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

**City and State are only required if a Zip (Postal Code) is not supplied.

                            

requestType = "addClientAddress" *required
clientid = [[previously retrieved clientid]] *required
address = Client Address (Line 1) ex: 'E. 56th St.' *required
addressType = Type of address, ex: 'Liked', 'Searched'. Defaults to 'other'
addressNum Address Number, ex: '16631' *required
suiteNo = Suite / Apartment Number
BldgFloor = Building Floor
poBox = P.O. Box Number
zip = Postal Code **required
state = State / Region **required
city = City **required
county = County
country = Country
subdivision = Subdivision name
mls = MLS number (string), ex: '1334422'

                        
returns

                            

"{"success": true, "clientAddressID": 195655}"

                        
addPlannerEvent
Required OAuth scopes: 'planner'

submit following fields using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "addPlannerEvent"
eventName = name of the transaction in Wise Agent *required
eventStartDate = start date of event in yyyy-mm-dd format *required
eventStartTime = start time of event in 12-hour 00:00 format
eventAMPM = AM or PM for event start time
eventEndDate = end date of event in yyyy-mm-dd format
eventEndTime = end time of event in 12-hour 00:00 format
eventEndAMPM = AM or PM for event end time

                        
returns

                            

"[{"success":"true"}]"

                        
addProperty
Required OAuth scopes: 'properties'

submit following form-urlencoded using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "addProperty"
Archive = true or false - sets property as archived
AddressNum = address number - 50 char limit *required
Address = address street name - 250 char limit *required
AddressSuit = suite number - 50 char limit
BldgFloor = building floor - 50 char limit
City = 100 char limit
State = 50 char limit
Zip = 50 char limit
Country = 50 char limit
County = 50 char limit
Subdivision = 255 char limit
LotNum = lot number - 50 char limit
PoBox = 50 char limit
MLS = MLS - 50 char limit
mlsarea = MLS Area - 50 char limit
mapgrid = map grid - 50 char limit
TourUrl = public url for property - 1024 char limit
Notes = notes on property
ClientId = ClientId of a user's contact
ClientRelation = type of relationship client has with property * if not provided, "N/A" will be used.
imageURLS_CSV = Image URLs to add to this property. Pass in multiple photos by separating the values with commas.
ListingPrice = Current listing price
LastSalePrice = Last sale price
YearBuilt = Year the property was built
TaxesAnnual = Annual Taxes Ammount
HOAAnnual = Annual HOA Taxes Ammount
NumBedrooms = Number of bedrooms
NumBathrooms = Number of bathrooms
SquareFt = Living Area in Square feet
LotSize = Lot Size
DateListed = Date this property was listed / will be listed
PropertyType = Type of property, i.e. Business, Home, Rental
ListingStatus = Listing Status, i.e. For Sale, Recently Sold
SchoolDistrict = Name of the school district for this property
NumHalfBathrooms = 50 char limit
DiningRooms = 50 char limit
DiningRoomDesc = 250 char limit
LivingRooms = 50 char limit
LivingRoomDesc = 250 char limit
InteriorFeaturesDesc = 250 char limit
ExteriorFeaturesDesc = 250 char limit
StyleDesc = 250 char limit
DesignDesc = 250 char limit
Fireplaces = 250 char limit
Stories = 50 char limit
Garage = 250 char limit
AgentName = 250 char limit
AgentPhone = 50 char limit
AgentEmail = 250 char limit
AgentID = 50 char limit
BrokerName = 250 char limit
BrokerEmail = 250 char limit
BrokerPhone = 50 char limit
OfficeName = 250 char limit
OfficeEmail = 250 char limit
OfficePhone = 50 char limit
OfficeID = 50 char limit
FranchiseName = 250 char limit
FranchiseEmail = 250 char limit
FranchisePhone = 50 char limit
Description = 250 char limit
Township = 50 char limit
BuyerAgent_Commission = 100 char limit
BuyerAgent_Concession = 255 char limit
SellerAgent_Commission = 100 char limit
SellerAgent_Concession = 255 char limit

                        
returns on success

                            

{"status": "success","data": {"propertyId": "1234"}}

                        
returns on error

                            

{"status": "error","data": "{message": "Address and AddressNum must be provided"}}
{"status": "error","data": "{message": "user not found"}}

                        
addPropertyPhoto
Required OAuth scopes: 'properties'

submit following form-urlencoded using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "addPropertyPhoto"
propertyId = Property ID of an existing property. Returned by 'getProperty' or 'addProperty' request types.
imageURLS_CSV = Image URLs to add to this property. Pass in multiple photos by separating the values with commas.

                        
returns on success

                            

{"status": "success","data": {"message": "Property Photos added."}}

                        
returns on error

                            

{"status": "error","data": "{message": "Property Not Found."}}

                        
addPropertyConnection
Required OAuth scopes: 'properties', 'contacts'

submit following form-urlencoded using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "addPropertyConnection"
PropertyID = Property ID of an existing property. Returned by 'getProperty' or 'addProperty' request types.
ClientID = ClientID of an existing client. Returned by 'getContacts'
ClientRelation = type of relationship client has with property * Default "ClientRelation" will be "N/A", if ommitted

                        
returns on success

                            

{"status": "success","data": {"message": "Client property relationship created."}}

                        
returns on error

                            

{"status": "error","data": "{message": "Property Not Found."}}

                        
attachFile
Required OAuth scopes: 'marketing' or 'contacts'

submit following form-urlencoded using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

Send file as a URL (must be publicly accessible)

Accepted File types: images, text documents, PDFs, etc... Application Binary / Executable files will not be accepted

Note: Maximum file size is 20MB and files added with the same name will be renamed with an appended version number

                            

requestType = "attachFile"
CLDataID = CLDataID of a Transaction, Returned by "getTransactionNames"
ClientID = ClientID of an existing client. Returned by 'getContacts'
Description = A file description to be added to the file
url = Publicly accessible URL to a file

                        
returns on success

                            

{"status": "success","data": {"message": "File(s) uploaded"}}

                        
returns on error

                            

{"status": "error","data": "{message": "File Exceeded maximum upload size of 20MB"}}

                        
                            

{"status": "error","data": "{message": "File type not allowed"}}

                        
addClientCustom
Required OAuth scopes: 'contacts'

submit following form-urlencoded using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

Note: The 'Key' field must be unique per-client. Duplicates are not allowed

                            

requestType = "addClientCustom"
ClientID = Retrieved from getContacts/getSingleContact *required
Key = (string) duplicates NOT allowed
Value = (string)

                        
returns on success

                            

{"success": true, "ClientCustomID": 115468}

                        
returns on error

                            

{"success": false, "message": "There was an error while inserting the data" }

                        
returns on duplicate key insertion

                            

{"success": false, "message": "Duplicate Key 'BuyersLink' cannot be inserted for ClientID 1187985" }

                        
addCategories
Required OAuth scopes: 'contacts'

submit following form-urlencoded using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "addCategories"
categories = csv of categories (ex. "New Lead,Prospect")

                        
returns on success

                            

{"success": true, "categories": [{"catName":"New Lead","catID":"1"},{"catName":"
Prospect","catID":"2"}]}

                        
returns on error

                            

{"Error": "Missing Categories CSV" }

                        
calls
Required OAuth scopes: 'contacts'

Create a request including the following parameters using http POST to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "calls"

NextContactDate = YYYY-MM-DD hh:mm
CallType = string
Completed = boolean (call will show as completed)
FlagImportant = boolean
InsideTeamId = integer - retreive team via GET requestType="getTeam". Otherwise, send "AssignedTo" as the Team member name
AssignedTo = Team Member Name - send if InsideTeamId not available.
Reason = string - limit 100 characters
ClientId = integer/string - unique identifier of contact. Prepend with 'V' for vendors.

                        
returns

                            

"{"success": true, "id": 123}"

                        
tasks
Required OAuth scopes: 'team'

Create a request including the following parameters using http POST to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "tasks"

Description =
TaskNote = "limit 2048 characters"
TaskDue = MM/DD/YYYY format
Priority = integer 0-3 - "0":"None", "1":"Low", "2":"Medium","3":"High"
InsideTeamId = retreive team via GET requestType="getTeam".
EstimatedTime = interger 0-4 - "0": "None", "1": "Less than 15 Minutes", "2":"15 - 30 Minutes","3":"30 - 60 Minutes","4":"More than an hour"
ContactID = 234 - ID of contact. Prepend with 'V' for vendors.
Completed = yes or no

                        
returns

                            

"{"success": true, "TaskID": 123}"

                        
Content
Required OAuth scopes: 'marketing'

submit following form-urlencoded using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "content"
ContentId: integer (not required, include if update) = 0
Name: string (100 char limit) = "Buyer 01" *Required
Category: string (50 char limit) = "Buyer"
Subject: string (100 char limit) = "5 Musts When Buying a New Home"
Html = "<h1>5 Things You Should Do Today</h1>" *Required

                        
returns

                            

"[{"success":"true","ContentId":12345}]"

                        
Web Hooks
Required OAuth scopes: 'profile'

submit following form-urlencoded using http POST to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "webhooks"
Status = (Active, Disabled)
EventType = One of the following: contactCreate, contactUpdate, contactDelete,taskCreate,taskUpdate,taskDelete,propertyCreate,propertyUpdate,propertyDelete,noteCreate,noteUpdate.
Url = “https://yourendpoint.com/handler/

                        
returns

                            

"[{"success":"true"}]"

                        
Ex. expect the following request data to be sent to provided Url for a 'contactUpdate' event. After receiving request, follow up with a request to Wise Agent API for a 'getSingleContact' request to get updated information.

                            

{"EventType":"contactUpdate", "EventCreated": DateTime.UTC, "ResourceIds": [clientId]}

                        
Certain webhook events will include a more specific "EventType" in post to help customize your programmability.

'contactUpdate': "contactUpdateCategory", "contactUpdateStatus", "contactUpdateSource" or "contactUpdate"
"taskUpdate": "taskUpdateComplete" or "taskUpdate"
                                

{"EventType":"contactUpdateCategory", "EventCreated": DateTime.UTC, "ResourceIds": [clientId]}

                            
Notice: noteCreate and noteUpdate webhook events are triggered by manual note changes/additions only. Notes added from other sources will not trigger this event.

addVisitedWebsite
Required OAuth scopes: 'contacts'

submit following parameters and JSON body using http PUT to:
https://thewiseagent.com/secure/client/api/ClientVisitedDomain.aspx

Querystring or Form Field Params

                                

apikey = 32 char alphanumeric string

                            
If SingleClient is not null, then only the single client information is processed. Otherwise, all the data in BulkClients (if any and not null) is processed.

ClientVisitedDomainDto

                            

{
"ClientId": number,
"UrlVisited": string (URI format),
"Label": string (250 char limit),
"DateTimeVisited": string (UTC format),
}


                        
Body

                            

{
"SingleClient": ClientVisitedDomainDto?,
"BulkClients": ClientVisitedDomainDto[]?,
}

                        
On Success

                            

200 OK

                        
On Error

                            

401 Unauthorized "No access token provided."
401 Unauthorized "Access token is invalid."
401 Unauthorized "No user apikey provided."
401 Unauthorized "User apikey is invalid."
404 Not Found "User with that apikey not found."
404 Not Found "Client with that ClientId not found."
400 Bad Request "No SingleClient or BulkClients objects provided."

                        
updateContactNote
Required OAuth scopes: 'contacts'

submit following fields using http PUT to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "updateContactNote"
noteID = The NoteID of the note you want to update
note = text of note to add
subject = subject of note to add
vendor = "true" if this is a vendor note, defaults to "false"

                        
Notes which have been locked cannot be updated with this method.

returns

                            

"[{"success": "true" }]"

                        
updateContactNoteCategories
Required OAuth scopes: 'contacts'

submit following fields using http PUT to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "updateContactNoteCategories"
noteID = The NoteID of the note you want to update categories
categories = comma separated string of categories to categorize note by
vendor = "true" if this is a vendor note, defaults to "false"

                        
Notes which have been locked cannot be updated with this method.

returns

                            

"[{"success": "true" }]"

                        
Web Hooks
Required OAuth scopes: 'profile'

Create a request including the following parameters using http PUT to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "webhooks"
WebhookID = 123
Status = (Active, Disabled)
EventType = (contactCreate, contactUpdate, contactDelete, taskCreate,taskUpdate,taskDelete,propertyCreate,propertyUpdate,propertyDelete,noteCreate,noteUpdate)
Url = “https://yourendpoint.com/handler/

                        
returns

                            

"[{"success":"true"}]"

                        
Notice: noteCreate and noteUpdate webhook events are triggered by manual note changes/additions only. Notes added from other sources will not trigger this event.

editClientCustomData
Required OAuth scopes: 'contacts'

Create a request including the following parameters using http DELETE to
https://sync.thewiseagent.com/http/webconnect.asp

Update existing ClientCustomData by Key, or edit both Key & Value fields by supplying a ClientCustomID

                            

requestType = "editClientCustomData"
ClientID = 1182332 *Required
Key = (string), the Key to use for the data*
Value = (string), the Value of the given Key
ClientCustomID = 27392 **

                        
* 'Key' is required if 'ClientCustomID' is not supplied.

** ClientCustomID is required if 'Key' is not supplied.

returns

                            

{"success":"true"}

                        
updateProperty
Required OAuth scopes: 'properties'

Create a request including the following parameters using http PUT to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "updateProperty"
propertyID* = Numeric ID of a property (* required)
Archive = true or false - sets property as archived
AddressNum = address number - 50 char limit *required
Address = address street name - 250 char limit *required
AddressSuit = suite number - 50 char limit
BldgFloor = building floor - 50 char limit
City = 100 char limit
State = 50 char limit
Zip = 50 char limit
Country = 50 char limit
County = 50 char limit
Subdivision = 255 char limit
LotNum = lot number - 50 char limit
PoBox = 50 char limit
MLS = MLS - 50 char limit
mlsarea = MLS Area - 50 char limit
mapgrid = map grid - 50 char limit
TourUrl = public url for property - 1024 char limit
Notes = notes on property
ClientId = ClientId of a user's contact
ClientRelation = type of relationship client has with property
ListingPrice = Current listing price
LastSalePrice = Last sale price
YearBuilt = Year the property was built
TaxesAnnual = Annual Taxes Ammount
HOAAnnual = Annual HOA Taxes Ammount
NumBedrooms = Number of bedrooms
NumBathrooms = Number of bathrooms
SquareFt = Living Area in Square feet
LotSize = Lot Size
DateListed = Date this property was listed / will be listed
PropertyType = Type of property, i.e. Business, Home, Rental
ListingStatus = Listing Status, i.e. For Sale, Recently Sold
SchoolDistrict = Name of the school district for this property
NumHalfBathrooms = 50 char limit
DiningRooms = 50 char limit
DiningRoomDesc = 250 char limit
LivingRooms = 50 char limit
LivingRoomDesc = 250 char limit
InteriorFeaturesDesc = 250 char limit
ExteriorFeaturesDesc = 250 char limit
StyleDesc = 250 char limit
DesignDesc = 250 char limit
Fireplaces = 250 char limit
Stories = 50 char limit
Garage = 250 char limit
AgentName = 250 char limit
AgentPhone = 50 char limit
AgentEmail = 250 char limit
AgentID = 50 char limit
BrokerName = 250 char limit
BrokerEmail = 250 char limit
BrokerPhone = 50 char limit
OfficeName = 250 char limit
OfficeEmail = 250 char limit
OfficePhone = 50 char limit
OfficeID = 50 char limit
FranchiseName = 250 char limit
FranchiseEmail = 250 char limit
FranchisePhone = 50 char limit
Description = 250 char limit
Township = 50 char limit
BuyerAgent_Commission = 100 char limit
BuyerAgent_Concession = 255 char limit
SellerAgent_Commission = 100 char limit
SellerAgent_Concession = 255 char limit


                        
Note: Only supplied fields will be updated

returns on success

                            

{"status": "success","data": {"propertyId": "1234"}}

                        
returns on error

                            

{"status": "error","data": "{message": "Property not found"}}
{"status": "error","data": "{message": "user not found"}}

                        
updatePropertySearchCriteria
Required OAuth scopes: 'properties'

submit following form-urlencoded fields using http PUT to:
https://sync.thewiseagent.com/http/webconnect.asp
Users are able to search contacts for similar Property Search Profiles

                            

requestType = "updatePropertySearchCriteria"
searchID = [[previously retrieved searchID]] *required
propInfo=1 *required
propCity
propZip *int
propType = [[residential,commercial,ect]]
propArea = [[land area]] *int
propNotes = [[extra notes]]
minPrice *int
maxPrice *int
propBath *int
propBed *int
propRentOwn = [[rent or own]]
propMoving = [[timespan in months (ex. "3")]] *int
propSqft = [[building sqft]] *int

                        
returns

                            

"{"success": true}"

                        
Error response

                            

"{""error"": ""SearchID not found""}"

                        
calls
Required OAuth scopes: 'contacts'

Create a request including the following parameters using http PUT to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "calls"
CallId = intiger - unique identifier

NextContactDate = YYYY-MM-DD hh:mm
CallType = string
Completed = boolean (call will show as completed)
DateCompleted = date time (UTC)
FlagImportant = boolean
InsideTeamId = integer - retreive team via GET requestType="getTeam". Otherwise, send "AssignedTo" as the Team member name
AssignedTo = Team Member Name - send if InsideTeamId not available.
Reason = string - limit 100 characters
ClientId = integer - unique identifier of contact

                        
returns

                            

"{"success": true, "id": 123}"

                        
tasks
Required OAuth scopes: 'team'

Create a request including the following parameters using http PUT to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "tasks"
TaskID = 123

Description =
TaskDue = MM/DD/YYYY format
Priority = integer 0-3 - "0":"None", "1":"Low", "2":"Medium","3":"High"
InsideTeamId = retreive team via GET requestType="getTeam".
EstimatedTime = interger 0-4 - "0": "None", "1": "Less than 15 Minutes", "2":"15 - 30 Minutes","3":"30 - 60 Minutes","4":"More than an hour"
ContactID = 234 - ID of contact. Prepend with 'V' for vendors.
Completed = yes or no

                        
returns

                            

"{"success": true, "TaskID": 123}"

                        
calls
Required OAuth scopes: 'contacts'

Create a request including the following parameters using http DELETE to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "webhooks"
CallId = integer - unique identifier

                        
returns

                            

"[{"success":"true"}]"

                        
removeContactNote
Required OAuth scopes: 'contacts'

submit following fields using http DELETE to:
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "removeContactNote"
noteID = The NoteID of the note you are removing.
vendor = Boolean value if this note is a vendor note (defaults to false).

                        
Notes which have been locked cannot be removed with this method.

returns

                            

"[{"success": "true" }]"

                        
tasks
Required OAuth scopes: 'team'

Create a request including the following parameters using http DELETE to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "webhooks"
TaskID = 123

                        
returns

                            

"[{"success":"true"}]"

                        
Web Hooks
Required OAuth scopes: 'profile'

Create a request including the following parameters using http DELETE to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "webhooks"
WebhookID = 123

                        
returns

                            

"[{"success":"true"}]"

                        
deleteProperty
Required OAuth scopes: 'properties'

Create a request including the following parameters using http DELETE to
https://sync.thewiseagent.com/http/webconnect.asp

                            

requestType = "deleteProperty"
propertyID = 123

                        
returns

                            

{"success":true}

                        
returns on error

                            

{"error":"propertyID was not found"}