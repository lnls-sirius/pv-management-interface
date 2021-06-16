import * as ui from "./ui.js";
import $ from "jquery";

const getUrl = () => {
    let host = "10.0.38.42";
    if (window.location.host === "vpn.cnpem.br") { // If using WEB VPN
        // Capture IPv4 address
        const ipRegExp = /https?\/((?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])))\//;
        const match = ipRegExp.exec(window.location.href);
        if (match && match.length > 1) {
            host = match[1];
        }
    } else {
        host = window.location.host;
    }

    if (host === "10.0.38.50" || window.location.host === "0.0.0.0:8000") {
        host = "10.0.38.42";
        console.log("DEBUG SERVER. Setting host to 10.0.38.42");
    }
    return host;
};

var baseUrl = getUrl();

var mgmtUrl = `https://${baseUrl}/archiver-generic-backend/bypass?${baseUrl}`;
var listedPVs = [];

var samplingRate = 0.1;

function resetListedPVs() {
    $("#pvTable").empty();
    listedPVs = [];
}

var statusCodeTxt = {
    0: "Check if you're logged in, connected and PV exists.",
    500: "Internal Server Error",
    200: "Unable to modify PV. Check if it exists and try again"
};

async function applySingleAction(action, PVs, secondaryAction, secondaryParam) {
    let secondary = secondaryAction ? secondaryAction + encodeURIComponent(secondaryParam) : "";

    try {
        await $.ajax({
            url: `${mgmtUrl}/mgmt/bpl/${action}?pv=${encodeURIComponent(PVs)}${secondary}`,
            dataType: "json",
            timeout: 15000,
            type: "get"
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
                console.log(errorThrown);
            });
    } catch (err) {
        console.error("Error while performing API request", err);
        return "Error";
    }
}

async function getStatus(PV, msg) {
    try {
        const ajaxResult = await $.ajax({
            url: `${mgmtUrl}/mgmt/bpl/getPVStatus?pv=${encodeURI(PV)}&reporttype=short`,
            dataType: "json",
            timeout: 10000,
            type: "get"
        })
            .fail(function (jqXHR) {
                if (msg) {
                    ui.displayMessage(`An error occured for ${PV}: ${statusCodeTxt[jqXHR.status]}`);
                }
            });
        return ajaxResult;
    } catch (err) {
        console.error("Error while performing API request", err);
        ui.displayMessage("Error while applying action to PVs. Please check your connection and try again.");
        return "Error";
    }
}

async function resumePV(pv) {
    await applySingleAction("resumeArchivingPV", pv["pvName"]);
    await displayStatus(pv["pvName"], false, "Being archived");

    Promise.resolve();
}

async function pausePV(pv) {
    await applySingleAction("pauseArchivingPV", pv["pvName"]);
    await displayStatus(pv["pvName"], false, "Paused");

    Promise.resolve();
}

async function archivePV(pv) {
    await applySingleAction("archivePV", pv["pvName"], "&samplingperiod=", samplingRate);
    await displayStatus(pv["pvName"], false, ["Being archived", "Initial sampling", "Appliance assigned"]);

    Promise.resolve();
}

async function displayStatus(name, msg, expected) {
    let PVs = [];

    if (Array.isArray(name)) {
        PVs = name;
    } else {
        PVs = await getStatus(name, msg);

        if (PVs === undefined) {
            ui.displayMessage(`Connection error while checking PV ${name}. Check if you're using HTTPS and if your connection is stable.`);
            return;
        }

        if (PVs.length === 0) {
            ui.displayMessage(`No PVs found with filter ${name}`);
            return;
        }
    }
    if (!Array.isArray(expected) && expected !== undefined) expected = [expected];

    PVs.forEach(function (PV) {
        if (expected !== undefined && !expected.includes(PV["status"])) {
            if ($("#log").text() === "Log in")
                ui.displayMessage(`Error for PV ${PV["pvName"]}. Check if you're logged in.`);
            else
                ui.displayMessage(`Error for PV ${PV["pvName"]}. Check if the PV exists.`);
        }

        $("#pvTable").append(`<tr>
        <td>${PV["pvName"] || "Unavailable"}</td>
        <td>${PV["status"] || "Unavailable"}</td>
        <td>${PV["lastEvent"] || "Unavailable"}</td>
        <td>${PV["appliance"] || "Unavailable"}</td>
        <td>${PV["connectionState"] == "true" ? "Connected" : "Disconnected"}</td>
        </tr>`);

        listedPVs.push(PV["pvName"]);
    });

    Promise.resolve();
}

async function deletePV(pv) {
    if (pv["status"] == "Initial sampling" || pv["status"] == "Appliance assigned") {
        await applySingleAction("abortArchivingPV", pv["pvName"]);
    } else {
        if (pv["status"] != "Paused") {
            await applySingleAction("pauseArchivingPV", pv["pvName"]);
        }
        await applySingleAction("deletePV", pv["pvName"], "&deleteData=", "true");
    }
    await displayStatus(pv["pvName"], false, "Not being archived");

    Promise.resolve();
}

async function renamePV(oldName, newName) {
    let status = await getStatus(oldName, false);
    if (status != "Paused")
        await applySingleAction("pauseArchivingPV", oldName);

    await applySingleAction("renamePV", oldName, "&newname=", newName);
    await applySingleAction("resumeArchivingPV", newName);
    await applySingleAction("deletePV", oldName, "&deleteData=", "true");

    await displayStatus(newName, false, "Being archived");

    Promise.resolve();
}

function setSRate(x) {
    samplingRate = x;
}

export {
    baseUrl,
    resetListedPVs,
    listedPVs,
    mgmtUrl,
    applySingleAction,
    renamePV,
    deletePV,
    pausePV,
    resumePV,
    archivePV,
    displayStatus,
    getStatus,
    setSRate
};