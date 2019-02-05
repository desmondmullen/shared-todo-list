$(document).ready(function () {
    //#region - initialize firebase and variables
    var config = {
        apiKey: "AIzaSyBKI_aJkYYr8ikLjgxQa_BCUh2gKCIl-98",
        authDomain: "dsm-shared-todo-list.firebaseapp.com",
        databaseURL: "https://dsm-shared-todo-list.firebaseio.com",
        projectId: "dsm-shared-todo-list",
        storageBucket: "",
        messagingSenderId: "288534093673"
    };
    firebase.initializeApp(config);
    var database = firebase.database();
    var userID;
    var userName;
    var userInstancesPath;
    var userBackupsPath;
    var theBackupRetrievalHasBeenDone = false;
    var theCount = 0;
    var geolocationStatusField = $("#geolocation-status");
    var map;
    var localStorageLastURLParams;
    var localStorageUIPath;
    var lastLocalStorageWrite;
    var authStateChanged = false;
    var turnedURLToInstancePath; //this is true if moot
    //#endregion

    //#region - buttons
    $("#add-entry").on("click", function (event) {
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

    $("body").delegate(".btn-delete", "click", function (event) {
        console.log("here");
        let theName = event.target.id;
        let theIdToDelete = theName.slice((theName.indexOf("-") + 1));
        let theDeleteString = "#task-" + theIdToDelete
        console.log(theDeleteString, theCount);
        $(theDeleteString).remove();
        theDeleteString = "#hr-" + theIdToDelete
        $(theDeleteString).remove();
    });

    $("body").delegate(".btn-add-note", "click", function (event) {
        let theName = event.target.id;
        let theIdToAddNote = theName.slice((theName.indexOf("-") + 1));
        let theAddNoteString = "#notes-" + theIdToAddNote
        $(theAddNoteString).append($("<div>").text($("#input-message").val().trim()));
        writeTodosFieldBackup();
        $("#input-message").val("");
    });
    //#endregion

    //#region - functions
    function doAddEntry(automatic) {
        let todaysDate = new Date().toLocaleDateString("en-US");
        let currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        console.log("do add entry:" + automatic + ", userID is: " + userID);
        if (automatic != "connected" && automatic != "disconnected") {
            var entryMessage = $("#input-message").val().trim() + "<br>";
        } else { //maybe uid to firebase and keep track of logged in?
            // if (automatic == "connected") {
            //     var entryMessage = "[connected]<br>";
            // } else {
            //     var entryMessage = "[disconnected]<br>";
            // };
        };
        $("#message-display").prepend("<span class='monospace'>" + todaysDate + " " + currentTime + " <strong>" + userName + "</strong>:</span> " + entryMessage);
        theLastMessage = todaysDate + " " + currentTime + entryMessage;
        writeEntriesFieldBackup();
        $("#input-message").val("");
    };

    function writeEntriesFieldBackup() {
        if (theBackupRetrievalHasBeenDone) {
            console.log("write entries field backup to: " + userBackupsPath);
            var theEntriesFieldContents = $("#message-display").html();
            database.ref(userBackupsPath).update({
                entriesFieldContents: theEntriesFieldContents,
            });
        };
    };

    function doAddTodo() {
        let todaysDate = new Date().toLocaleDateString("en-US");
        let currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        console.log("do add todo. userID is: " + userID);
        var todoMessage = "<section id=\"task-" + theCount + "\" class=\"section-todo\">" + todaysDate + ": " + $("#input-message").val().trim() + "<section id=\"notes-" + theCount + "\"></section><button id=\"btnaddnote-" + theCount + "\" class=\"btn-add-note\">add note</button><button id=\"btndelete-" + theCount + "\" class=\"btn-delete\">delete</button></section><hr id=\"hr-" + theCount + "\">";
        database.ref(userBackupsPath).update({
            theCount: theCount,
        });
        $("#todo-display").prepend(todoMessage);
        theCount++
        writeTodosFieldBackup();
        $("#input-message").val("");
    };

    function writeTodosFieldBackup() {
        if (theBackupRetrievalHasBeenDone) {
            console.log("write todos field backup to: " + userBackupsPath);
            var theTodosFieldContents = $("#todo-display").html();
            database.ref(userBackupsPath).update({
                todosFieldContents: theTodosFieldContents,
            });
        };
    };

    function emptyInputFields() {
        console.log("empty input fields");
        $("#input-message").val("");
        $("#message-display").text("");
        $("#todo-display").text("");
        userID = "";
        userName = "";
        userInstancesPath = "";
        userBackupsPath = "";
        userLatitude;
        userLongitude;
        userLatLong;
    };
    //#endregion

    //#region - listeners
    database.ref(userBackupsPath).on("value", function (snapshot) {
        console.log("backups value change - retrieval done: " + theBackupRetrievalHasBeenDone + ". path: " + userBackupsPath);
        if (!theBackupRetrievalHasBeenDone && authStateChanged) {
            console.log("doing backup retrieval: " + userBackupsPath);
            var theEntriesBackup = snapshot.child(userBackupsPath + "/entriesFieldContents/").val();
            var theTodosBackup = snapshot.child(userBackupsPath + "/todosFieldContents/").val();
            theTempCount = snapshot.child(userBackupsPath + "/theCount/").val();
            if (theTempCount > 0) {
                theCount = theTempCount;
            };
            $("#message-display").html(theEntriesBackup);
            $("#todo-display").html(theTodosBackup);
            theBackupRetrievalHasBeenDone = true;
        };
    }, function (errorObject) {
        console.log("todos-error: " + errorObject.code);
    });
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
    // connectionsRef.on("value", function (connectionsSnapshot) {
    //     console.log("number online: " + connectionsSnapshot.numChildren());
    // }); // Number of online users is the number of objects in the presence list.

    firebase.auth().signInAnonymously().catch(function (error) {
        console.log("sign in anonymously");
        let errorCode = error.code;
        let errorMessage = error.message;
        console.log("anonymous login error: " + errorCode, errorMessage);
        // ...
    });

    function turnURLIntoUserInstancesPath(theLink) {
        console.log("turn URL: " + theLink);
        // if (theLink == null || theLink == "" || theLink == undefined) {
        //     theLink = window.location.href;
        // }
        window.localStorage.setItem("theLastURLParameters", theLink);
        window.history.replaceState({}, document.title, window.location.href.split('?')[0]);//cleans up sign-in link params
        let theInstancesPath = (theLink.substring((theLink.indexOf("?") + 1), theLink.indexOf("&")));
        if (theInstancesPath != null) {
            userInstancesPath = decodeURIComponent(theInstancesPath);
            userBackupsPath = userInstancesPath + "/backups";
            console.log("new path: " + decodeURIComponent(theInstancesPath));
        } else {
            console.log("new path was null, existing path is: " + userInstancesPath);
        };
    };

    function signOut() {
        doAddEntry("disconnected");
        firebase.auth().signOut();
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
        localStorageUIPath = window.localStorage.getItem("userInstancesPath");
        localStorageLastURLParams = window.localStorage.getItem("theLastURLParameters");
        userName = window.localStorage.getItem("userName");
        lastLocalStorageWrite = window.localStorage.getItem("userName");
        console.log("localStorageUIPath: " + localStorageUIPath);
        firebase.auth().onAuthStateChanged(function (user) {
            if (user) {
                console.log("auth state changed: " + user.uid);
                userID = user.uid; //when connecting by link, this will be the same user
                if (lastLocalStorageWrite + 30000 < Date.now() {
                    if (userName != "" && userName != null && userName != undefined) {
                        let tempUserName = prompt("Please enter a name to use for sending messages. Last time, this was used:", userName);
                        if (tempUserName !== null && tempUserName.trim() !== "") {
                            userName = tempUserName;
                        };
                        window.localStorage.setItem("userName", userName);
                        console.log("user name after last used. LS: " + window.localStorage.getItem("userName"));
                    } else {
                        let shortUserName = Math.floor(Math.random() * 1000 + 1000);
                        userName = prompt("Please enter a name to use for sending messages. If you don't choose one, we'll call you by this random number:", shortUserName);
                        if (userName == null || userName.trim() == "") {
                            userName = shortUserName;
                        };
                        let theLastWrite = Date.now()
                        window.localStorage.setItem("userName", userName);
                        window.localStorage.setItem("lastWrite", theLastWrite);
                        console.log("user name after prompt for new. LS: " + window.localStorage.getItem("userName"));
                    };
                } else {
                    console.log("user name from LS - no prompting: " + window.localStorage.getItem("userName"));
                    // };
                };

                // User is signed in.
                if (window.location.href.indexOf("?") > 0) {
                    console.log("UIP before: " + userInstancesPath);
                    turnURLIntoUserInstancesPath(window.location.href);
                    console.log("UIP after: " + userInstancesPath);
                    location = location;
                } else {
                    if (localStorageUIPath != null) {
                        userInstancesPath = localStorageUIPath;
                    } else {
                        userInstancesPath = "users/" + userID + "/instances/" + (+new Date());
                    }
                    userMessagesPath = userInstancesPath + "/messages";
                    userTodosPath = userInstancesPath + "/todos";
                    userBackupsPath = userInstancesPath + "/backups";
                }
                if (localStorageLastURLParams != null) {
                    turnURLIntoUserInstancesPath(localStorageLastURLParams);
                };
                authStateChanged = true;
                if (lastLocalStorageWrite + 3000 < (+new Date())) {
                    getLocation(); //correct to do this if?
                }
                setTimeout(function () {
                    doAddEntry("connected");
                }, 2000);
            };
        });
    }

    initializeDatabaseReferences();
    //#endregion

    //#region - mobile formatting fix
    var isMobile = {
        Android: function () { return navigator.userAgent.match(/Android/i); },
        BlackBerry: function () { return navigator.userAgent.match(/BlackBerry/i); },
        iOS: function () { return navigator.userAgent.match(/iPhone|iPad|iPod/i); },
        Opera: function () { return navigator.userAgent.match(/Opera Mini/i); },
        Windows: function () { return navigator.userAgent.match(/IEMobile/i); },
        any: function () { return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows()); }
    };

    if (isMobile.Android()) {
        // $("#message-display").css("top", "60%");
    };
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

    console.log("v1.1592");
});