$(document).ready(function () {
    //#region - initialize firebase and variables
    var config = {
        apiKey: "AIzaSyC3DrasuTKwDHLaaqV_hdlVnnLDqdTY1gE",
        authDomain: "dsm-simple-messaging.firebaseapp.com",
        databaseURL: "https://dsm-simple-messaging.firebaseio.com",
        projectId: "dsm-simple-messaging",
        storageBucket: "dsm-simple-messaging.appspot.com",
        messagingSenderId: "634303355719"
    };
    firebase.initializeApp(config);

    var database = firebase.database();
    var userID;
    var userName;
    var userIdentificationPath;
    var userInstancesPath;
    var userMessagesPath;
    var userTodosPath;
    var theLastMessage;
    var geolocationListField = $("#geolocation-list");
    var geolocationStatusField = $("#geolocation-status");
    var map;
    //#endregion

    //#region - buttons
    $(".add-entry").on("click", function (event) {
        event.preventDefault();
        doAddEntry();
    });

    $("#add-todo").on("click", function (event) {
        event.preventDefault();
        doAddTodo();
    });

    $("#send-link").on("click", function () {
        console.log("sending user instances path: " + userInstancesPath);
        let theEmailAddressToSendLinkTo = prompt("Please enter the email address to send the link to:");
        if (theEmailAddressToSendLinkTo != null) {
            sendEmailLink(theEmailAddressToSendLinkTo);
        }
    });

    $("#sign-out").on("click", function () {
        signOut();
        emptyInputFields();
    });
    //#endregion

    //#region - functions
    function doAddEntry(automatic) {
        let todaysDate = new Date().toLocaleDateString("en-US");
        let currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        console.log("do add entry:" + automatic + ", userID is: " + userID);
        if (automatic != "connected" && automatic != "disconnected") {
            var entryMessage = $("#input-message").val().trim() + "<br>";
        } else {
            if (automatic == "connected") {
                var entryMessage = "[connected]<br>";
            } else {
                var entryMessage = "[disconnected]<br>";
            };
        };
        database.ref(userMessagesPath).set({
            dateTime: todaysDate + " " + currentTime,
            userName: userName,
            message: entryMessage,
            currentLat: userLatitude,
            currentLong: userLongitude,
            currentGeolocation: "lat: " + userLatitude +
                ", lng: " + userLongitude
        });
        $("#input-message").val("");
    };

    function doAddTodo() {
        let todaysDate = new Date().toLocaleDateString("en-US");
        let currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        console.log("do add todo:" + automatic + ", userID is: " + userID);
        var todoMessage = $("#input-message").val().trim() + "<br>";
        database.ref(userTodosPath).set({
            dateTime: todaysDate + " " + currentTime,
            userName: userName,
            todo: todoMessage,
        });
        $("#input-message").val("");
    };

    function doAddTodoNote() {
        let todaysDate = new Date().toLocaleDateString("en-US");
        let currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        console.log("do add todo note:" + automatic + ", userID is: " + userID);
        var todoNote = $("#input-message").val().trim() + "<br>";
        database.ref(userTodosPath).set({
            dateTime: todaysDate + " " + currentTime,
            userName: userName,
            todoNote: todoNote
        });
        $("#input-message").val("");
    };

    function emptyInputFields() {
        console.log("empty input fields");
        $("#input-message").val("");
        $("#message-display").text("");
        $("#todo-display").text("");
        $("#geolocation-list").text("");
        userID = "";
        userSignedIn = "";
        userName = "";
        userIdentificationPath = "";
        userInstancesPath = "";
        userMessagesPath = "";
        userTodoPath = "";
        userLatitude;
        userLongitude;
        userLatLong;
    };
    //#endregion

    //#region - listeners
    database.ref(userMessagesPath).on("value", function (snapshot) {
        let theMessageDateTime = snapshot.child(userMessagesPath + "/dateTime/").val();
        let theMessageUserName = snapshot.child(userMessagesPath + "/userName/").val();
        let theMessageMessage = snapshot.child(userMessagesPath + "/message/").val();
        let theCurrentLat = parseFloat(snapshot.child(userMessagesPath + "/currentLat/").val());
        let theCurrentLong = parseFloat(snapshot.child(userMessagesPath + "/currentLong/").val());
        let theCurrentGeolocation = snapshot.child(userMessagesPath + "/currentGeolocation/").val();
        if (theMessageDateTime != null && theMessageDateTime + theMessageMessage != theLastMessage) {
            $("#message-display").prepend("<span class='monospace'>" + theMessageDateTime + " <strong>" + theMessageUserName + "</strong>:</span> " + theMessageMessage);
            theLastMessage = theMessageDateTime + theMessageMessage;
        };
        if ((theCurrentGeolocation != "lat: undefined, lng: undefined") && (theCurrentGeolocation != null)) {
            console.log(theMessageDateTime, theMessageUserName, theCurrentGeolocation);
            let theLatLong = { lat: theCurrentLat, lng: theCurrentLong };
            placeMarker(theLatLong, theMessageUserName);
        };
    }, function (errorObject) {
        console.log("entries-error: " + errorObject.code);
    });

    database.ref(userTodosPath).on("value", function (snapshot) {
        let theTodoDateTime = snapshot.child(userTodosPath + "/dateTime/").val();
        let theTodoUserName = snapshot.child(userTodosPath + "/userName/").val();
        let theTodoMessage = snapshot.child(userTodosPath + "/todo/").val();
        if (theTodoDateTime != null && theTodoDateTime + theTodoMessage != theLastTodo) {
            $("#todo-display").prepend("<span class='monospace'>" + theTodoDateTime + " <strong>" + theTodoUserName + "</strong>:</span> " + theTodoMessage);
            theLastTodo = theTodoDateTime + theTodoMessage;
        };
    }, function (errorObject) {
        console.log("todos-error: " + errorObject.code);
    });
    //#endregion

    //#region - authorization
    //--> how to fold a region //#region and //#endregion and //region and //endregion
    function toggleSignIn() {
        if (firebase.auth().currentUser) {
            //do signout
        } else {
            var email = document.getElementById("email").value;
            var password = document.getElementById("password").value;
            if (email.length < 4) {
                alert("Please enter an email address.");
                return;
            }
            if (password.length < 4) {
                alert("Please enter a password.");
                return;
            }
            firebase.auth().signInWithEmailAndPassword(email, password).catch(function (error) {
                var errorCode = error.code;
                var errorMessage = error.message;
                if (errorCode === "auth/wrong-password") {
                    alert("Password is incorrect.");
                } else {
                    alert(errorMessage);
                }
                handleError(error);
            });
        }
    }

    //Handles the sign up button press.
    function handleSignUp() {
        var email = document.getElementById("email").value;
        var password = document.getElementById("password").value;
        if (email.length < 4) {
            alert("Please enter an email address.");
            return;
        }
        if (password.length < 4) {
            alert("Please enter a password.");
            return;
        }
        firebase.auth().createUserWithEmailAndPassword(email, password).catch(function (error) {

            var errorCode = error.code;
            var errorMessage = error.message;
            if (errorCode == "auth/weak-password") {
                alert("The password must be at least 6 characters.");
            } else {
                alert(errorMessage);
            }
            handleError(error);
        });
    }

    function handleSignIn() {
        console.log("handle sign-in");
        if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
            turnURLIntoUserInstancesPath();
            // Disable the sign-in button during async sign-in tasks.
            // document.getElementById("sign-in").disabled = true;
            // Get the email if available.
            // var email = window.localStorage.getItem('emailForSignIn');
            // if (!email) {
            //     // User opened the link on a different device. To prevent session fixation attacks, ask the
            //     // user to provide the associated email again. For example:
            //     email = window.prompt('Please provide the email you\'d like to sign-in with for confirmation.');
            // }
            if (1 == 2) {
                // if (email) {
                firebase.auth().signInWithEmailLink(email, window.location.href).then(function (result) {
                    turnURLIntoUserInstancesPath();
                }).catch(function (error) {
                    handleError(error);
                });
            }
        }
    }

    function sendPasswordReset() {
        var email = document.getElementById("email").value;
        firebase.auth().sendPasswordResetEmail(email).then(function () {
            alert("If there is an account with the address '" + email + "', a password reset link will be sent to that address.");
        }).catch(function (error) {
            var errorCode = error.code;
            var errorMessage = error.message;
            if (errorCode == "auth/invalid-email") {
                alert(errorMessage);
            } else if (errorCode == "auth/user-not-found") {
                alert(errorMessage);
            }
            handleError(error);
        });
    }
    //#endregion

    //#region - connections
    var connectionsRef = database.ref("/connections");
    var connectedRef = database.ref(".info/connected");

    connectedRef.on("value", function (connectedSnapshot) {
        if (connectedSnapshot.val()) {
            var theConnection = connectionsRef.push(true);
            theConnection.onDisconnect().remove();
        };
    });
    connectionsRef.on("value", function (connectionsSnapshot) {
        console.log("number online: " + connectionsSnapshot.numChildren());
    }); // Number of online users is the number of objects in the presence list.

    firebase.auth().signInAnonymously().catch(function (error) {
        console.log("sign in anonymously");
        let errorCode = error.code;
        let errorMessage = error.message;
        console.log("anonymous login error: " + errorCode, errorMessage);
        // ...
    });

    function turnURLIntoUserInstancesPath(theLink) {
        if (theLink == null || path == "" || path == undefined) {
            theLink = window.location.href;
        }
        window.localStorage.setItem("theLastURLParameters", theLink);
        window.history.replaceState({}, document.title, window.location.href.split('?')[0]);//cleans up sign-in link params
        let theInstancesPath = (theLink.substring((theLink.indexOf("?") + 1), theLink.indexOf("&")));
        if (theInstancesPath != null) {
            userInstancesPath = decodeURIComponent(theInstancesPath);
            userMessagesPath = userInstancesPath + "/messages";
            userTodoPath = userInstancesPath + "/todos";
            console.log("new path: " + decodeURIComponent(theInstancesPath));
        } else {
            console.log("new path was null, existing path is: " + userInstancesPath);
        };
    };

    function signOut() {
        doAddEntry("disconnected");
        firebase.auth().signOut();
        userSignedIn = false;
        window.localStorage.removeItem("userInstancesPath");
        emptyInputFields();
        window.history.replaceState({}, document.title, window.location.href.split('?')[0]);//cleans up sign-in link params
        location = location;
    };

    function sendEmailLink(theEmailAddress) {
        let actionCodeSettings = {
            // URL must be whitelisted in the Firebase Console.
            'url': "https://desmondmullen.com/shared-todo-list/?" + userInstancesPath,
            'handleCodeInApp': true // This must be true.
        };
        firebase.auth().sendSignInLinkToEmail(theEmailAddress, actionCodeSettings).then(function () {
            window.localStorage.setItem("userInstancesPath", userInstancesPath);
            alert('An email was sent to ' + theEmailAddress + '. This instance can be accessed by anyone using the link in that email.');
        }).catch(function (error) {
            handleError(error);
        });
    }

    function handleError(error) {
        let errorCode = error.code;
        let errorMessage = error.message;
        alert('Error: ' + errorMessage);
        console.log("handle error: " + errorCode, errorMessage);
    }
    //#endregion

    //#region - initialize database
    function initializeDatabaseReferences() {
        let localStorageUIPath = window.localStorage.getItem("userInstancesPath");
        let localStorageLastURLParams = window.localStorage.getItem("theLastURLParameters");
        console.log("localStorageUIPath: " + localStorageUIPath);
        firebase.auth().onAuthStateChanged(function (user) {
            if (user) {
                console.log("auth state changed: " + user.uid);
                userID = user.uid; //when connecting by link, this will be the same user
                let shortUserID = Math.floor(Math.random() * 1000 + 1000);
                userName = prompt("Please enter a name to use for sending messages. If you don't choose one, we'll call you by this random number:", shortUserID);
                if (userName == null || userName.trim() == "") {
                    userName = shortUserID;
                };
                // User is signed in.
                userSignedIn = true;
                userIdentificationPath = "users/" + userID + "/identification";
                if (window.location.href.indexOf("?") > 0) {
                    turnURLIntoUserInstancesPath();
                    console.log("user ID after signout: " + userID);
                } else {
                    if (localStorageUIPath != null) {
                        userInstancesPath = localStorageUIPath;
                    } else {
                        userInstancesPath = "users/" + userID + "/instances/" + (+new Date());
                    }
                    userMessagesPath = userInstancesPath + "/messages";
                    userTodosPath = userInstancesPath + "/todos";
                }
                if (localStorageLastURLParams != null) {
                    turnURLIntoUserInstancesPath(localStorageLastURLParams);
                };
                getLocation();
                setTimeout(function () {
                    doAddEntry("connected");
                }, 2000);
            };
        });
    }

    initializeDatabaseReferences();
    //#endregion

    //#region - geolocation
    var userLatitude;
    var userLongitude;
    var initMapLatLong;
    var mapDisplayField = $("#map");

    function getLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showPosition);
        } else {
            geolocationStatusField.text("Geolocation is not supported by this browser");
        }
    }

    getLocation();
    setInterval(function () { getLocation(); }, 60000);

    function showPosition(position) {
        userLatitude = parseFloat(position.coords.latitude);
        userLongitude = parseFloat(position.coords.longitude);
        if (initMapLatLong != userLatitude, userLongitude) {
            console.log("redoing initMap: " + initMapLatLong + " / " + userLatitude, userLongitude);
            initMap();
        }
    }

    function initMap() {
        setTimeout(function () {
            console.log("init map: " + userLatitude, userLongitude);
            initMapLatLong = userLatitude, userLongitude;
            var userLatLong = { lat: userLatitude, lng: userLongitude };
            map = new google.maps.Map(document.getElementById("map"), {
                zoom: 16,
                center: userLatLong
            });
            placeMarker(userLatLong, "You are here");
            geolocationStatusField.text("Latitude: " + userLatitude + ", Longitude: " + userLongitude);

        }, 500);
    }

    function placeMarker(theLatLong, title) {
        var marker = new google.maps.Marker({
            position: theLatLong,
            map: map,
            title: title
        });
    }
    //#endregion

    console.log("v1");
});