import "../css/main.css";
import * as login from "./login.js";
import * as action from "./action.js";
import * as ui from "./ui.js";
import Papa from "papaparse";
import $ from "jquery";

let actions = {
    "Check Status": action.displayStatus,
    Rename: action.renamePV,
    Delete: action.deletePV,
    Resume: action.resumePV,
    Pause: action.pausePV,
    Archive: action.archivePV
};

// Runs once page finishes loading
$(async function() {
    // The following workaround is to defeat the automatic "conversion" of functions by the web VPN
    if (window.location["protocol"] !== "https:" && window.location.host != "10.0.38.50") {
        ui.displayMessage("You are accessing this through HTTP. Redirecting to HTTPS...");
        location.replace(`https:${location.href.substring(location.protocol.length)}`);
    }

    $("#importCSV").val("");
    login.queryUser();

    let options_str;
    for (const [key] of Object.entries(actions)) {
        options_str += "<option value=\"" + key + "\">" + key + "</option>";
    } // Populates options dropdown with actions

    $("#action").html(options_str);
});

function filterEmpty(pv) {
    return pv != "";
}

$("#applyPVchanges").on("click", async function() {
    let oldpvs, newpvs;
    if ($("#PVold").val().indexOf(",") >= 0) {
        oldpvs = [...new Set($("#PVold").val().replace(/\s/g, "").split(","))].filter(filterEmpty);
    } else {
        oldpvs = [...new Set($("#PVold").val().replace(/[ \t\r]/g, "").split(/\r?\n/))].filter(filterEmpty);
    }

    let operation = $("#action")[0].value;

    $("#applyPVchanges").prop("disabled", true);
    action.resetListedPVs();

    $(".lds-ellipsis").show();
    $(".progress").html("Fetching PV listing...");

    let processedPVs = 0;
    if (operation == "Rename") {
        if ($("#PVnew").val().indexOf(",") >= 0) {
            newpvs = [...new Set($("#PVnew").val().replace(/\s/g, "").split(","))].filter(filterEmpty);
        } else {
            newpvs = [...new Set($("#PVnew").val().replace(/ /g, "").split(/\r?\n/))].filter(filterEmpty);
        }

        if (await action.getStatus(oldpvs[0]) === "Error") {
            ui.resetProgress();
            return;
        }

        if (newpvs.length == oldpvs.length) {
            if ($("#PVold").val().indexOf("*") > -1 || $("#PVnew").val().indexOf("*") > -1) {
                ui.displayMessage("When renaming PVs, avoid wildcards (* filter), as they select multiple PVs.");
            } else {
                for (let i = 0; i < newpvs.length; i++) {
                    if (oldpvs[i] == newpvs[i]) {
                        ui.displayMessage(`Invalid operation for ${oldpvs[i]}: New name matches old name.`);
                    } else {
                        $(".progress").html(`${++processedPVs} of ${oldpvs.length} PVs processed`);
                        await action.renamePV(oldpvs[i], newpvs[i]);
                    }
                }
            }
        } else {
            ui.displayMessage("Invalid operation: Number of new PV names differs from the number of old PVs given.");
        }
    } else {
        if (operation == "Delete") {
            if (!confirm("Are you sure you want to delete these PVs? This operation cannot be undone.")) {
                ui.displayMessage("Delete operation cancelled by user.");
                ui.resetProgress();

                return;
            }
        }
        let pvs = [];
        let resultsBatch = [];

        for (let i = 0; i < oldpvs.length; i++) {
            let status = await action.getStatus(oldpvs[i]);

            if (status === "Error") {
                ui.resetProgress();
                return;
            }
            resultsBatch.push(status);

            // Each batch of requests is limited to 6 due to browser restrictions on parallel requests
            if (resultsBatch.length > 6 || oldpvs.length - 1 == i) {
                await Promise.all(resultsBatch).then((fetchedPVs) => {
                    pvs = [].concat.apply(pvs, fetchedPVs); // Flattens promise result array and merges with PVs
                });
                resultsBatch = [];
            }
        }

        pvs = [...new Map(pvs.map(pv => [pv["pvName"], pv])).values()]; // Removes duplicates

        $(".progress").html(`0 of ${pvs.length} PVs processed`);

        if (operation == "Check Status") {
            processedPVs = pvs.length;
            actions[operation](pvs).then($(".progress").html(`${processedPVs} of ${pvs.length} PVs processed`));
        } else if (operation == "Delete") {
            for (const pv of pvs) {
                // Send all PV properties, in order to shave off time and reduce errors by checking states before applying operations
                resultsBatch.push(actions[operation](pv));

                if (resultsBatch.length > 6 || pvs.length - processedPVs < 6) {
                    await Promise.all(resultsBatch);
                    $(".progress").html(`${processedPVs += resultsBatch.length} of ${pvs.length} PVs processed`);
                    resultsBatch = [];
                }
            }
        } else {
            for (const pv of pvs) {
                resultsBatch.push(actions[operation](pv["pvName"]));

                if (resultsBatch.length > 6 || pvs.length - processedPVs < 6) {
                    await Promise.all(resultsBatch);
                    $(".progress").html(`${processedPVs += resultsBatch.length} of ${pvs.length} PVs processed`);
                    resultsBatch = [];
                }
            }
        }
    }

    if (!processedPVs) {
        $(".progress").html("No valid PVs to process.");
    } else {
        if (processedPVs > 0 && processedPVs != oldpvs.length) {
            $(".progress").html(`${oldpvs.length} of ${oldpvs.length} PVs processed`);
        }
    }

    $(".lds-ellipsis").hide();
    $("#applyPVchanges").prop("disabled", false);
});

$("table").on("click", "tr", function() {
    let pv = this.cells[0].textContent;
    if (pv != "PV Name") {
        window.open(`http://${action.baseUrl}/archiver-viewer/?pv=${pv}`);
    }
});

$("#chartPVs").on("click", async function() {
    let pvs = action.listedPVs;
    window.open(`http://${action.baseUrl}/archiver-viewer/?pv=${pvs.join("&pv=")}`);
});

$("#log").on("click", function() {
    if (this.text == "Log out") {
        login.logout();
    } else {
        window.location = "login.html";
    }
});

$("#action").on("change", function() {
    $("#PVnew").toggle(this.value == "Rename");
});

$("#importCSV").on("change", function() {
    if (!/^.+\.(csv)/.test(this.value)) {
        $("#importCSV").css("background-color", "#ff4d4d"); // Sets background color to red
        alert("Invalid file type. Please select a valid CSV file.");
    } else {
        $("#importCSV").css("background-color", "#99ff99"); // Sets background color to green

        let newpvs = "";
        let oldpvs = "";

        Papa.parse(this.files[0], {
            complete: function(results) {
                results.data.forEach(function(pv) {
                    oldpvs += pv[0] ? "," + pv[0] : "";
                    newpvs += pv[1] ? "," + pv[1] : "";
                });
                $("#PVold").val(oldpvs.substring(1)); // Remove first comma
                $("#PVnew").val(newpvs.substring(1));
            }
        });
    }
});

$(".openDropdown").on("click", function() {
    $(".optionsDropdown").toggle();
    $(".arrow").toggleClass("up");
});

$("#samplingRate").on("change", function(e) {
    action.setSRate(e.currentTarget.value);
});