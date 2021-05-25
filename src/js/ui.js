import $ from "jquery";

async function displayMessage(message) {
    await waitUntil(_ => $("#message").css("display") != "block"); // eslint-disable-line no-unused-vars
    if (!$("#hideMessage").is(":checked"))
        $("#message").html(message).fadeIn(200).delay(3000).fadeOut(200);
}

function waitUntil(condition) {
    const poll = resolve => {
        if (condition()) resolve();
        else setTimeout(_ => poll(resolve), 100); // eslint-disable-line no-unused-vars
    };

    return new Promise(poll);
}

function resetProgress() {
    $(".progress").html("No valid PVs to process.");
    $(".lds-ellipsis").hide();
    $("#applyPVchanges").prop("disabled", false);
}

$("#message").on("click", function() {
    $(this).hide();
});

export {
    displayMessage,
    resetProgress
};