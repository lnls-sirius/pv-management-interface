import * as actions from "./action.js";
import * as ui from "./ui.js";

import $ from "jquery";

async function queryUser() {
    try {
        await $.ajax({
                url: `${actions.mgmtUrl}/mgmt/bpl/getLoginUsername`,
                dataType: "json",
                type: "get",
                timeout: 3000
            })
            .then(function(data) {
                if (data.username != null) {
                    $("#username").text(data.username);
                    $("#log").text("Log out");
                }
            })
            .fail(function() {
                $("#user").text("You are currently not logged in");
                ui.displayMessage("A connection error has occurred. Check if you're using HTTPS and connected.");
                console.warn("Protocol:", location.protocol);
            });
    } catch (err) {
        console.error("Error while fetching username", err);
    }
}

async function login() {
    let username = $("#user")[0].value;
    let password = $("#pass")[0].value;

    try {
        await $.ajax({
                url: `${actions.mgmtUrl}/mgmt/bpl/login`,
                dataType: "json",
                timeout: 3000,
                type: "post",
                data: {
                    username: encodeURIComponent(username),
                    password: encodeURIComponent(password)
                }
            })
            .then(function(data) {
                if (data.validate == "authenticated") {
                    window.location = "index.html";
                } else {
                    ui.displayMessage("Invalid Credentials.");
                    if (data["error"] && data["error"] === "failed with error javax.servlet.ServletException: Login failed") {
                        ui.displayMessage("Invalid Credentials.");
                    } else {
                        ui.displayMessage("User does not have enough privileges to edit the archiver parameters.");
                    }
                }
            })
            .fail(function(jqXHR, textStatus) {
                ui.displayMessage(`An error occured on the server while logging in: ${textStatus}. Check your connection`);
            });
    } catch (err) {
        console.error("Error while logging in", err);
    }
}

$("#login").on("click", function() {
    login();
});

$("#pass, #user").on("keypress", function(e) {
    if (e.key === "Enter") login();
});

async function logout() {
    try {
        await $.ajax({
                url: `${actions.mgmtUrl}/mgmt/bpl/logout`,
                dataType: "json",
                type: "get",
            })
            .then(function(data) {
                if (data.username != null && data.username != undefined) {
                    $("#username").text("You are currently not logged in.");
                    $("#log").text("Log in");
                }
            })
            .fail(function(jqXHR, textStatus) {
                ui.displayMessage(`An error occured on the server while logging out: ${textStatus}. Check your connection`);
            });
    } catch (err) {
        console.error("Error while logging out", err);
    }
}

export {
    queryUser,
    logout
};