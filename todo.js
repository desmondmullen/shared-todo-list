// $("h1").on("click", "p.test", function () {
//     alert($(this).text());
// });

$("body").delegate("button", "click", function (event) {
    let theName = event.target.id;
    let theIdToDelete = theName.slice((theName.indexOf("-") + 1));
    let theDeleteString = "#task-" + theIdToDelete
    $(theDeleteString).empty();
    let theDeleteString = "#hr-" + theIdToDelete
    $(theDeleteString).empty();
});

// $("#new-task").on('keypress', function (event) {
//     if (event.which == 13) {
//         addItem();
//     }
// });

var theCount = 0
function addItem() {
    $("#todo-display").prepend("<section id=\"task-" + theCount + "\">" + $("#new-task").val() + "<button id =\"button-" + theCount + "\">delete</button></section><hr id=\"hr-" + theCount + "\">");
    $("#new-task").val("");
    theCount++
}