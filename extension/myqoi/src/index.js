const ONE_HOUR = 60 * 60000;
let payload = {};

// TODO - this is a very minor race condition. fix it by making sure that the user info is fetched
//        before a test starts if we notice issues.
// Get the email address and id from chrome identity and add to payload object.
getUserInfo(payload);

// Get id and email
function getUserInfo(payload) {
  chrome.identity.getProfileUserInfo((info) => {
    // Get domain name from email address as organization
    const emailArray = info.email.split("@") ?? null;
    if (emailArray !== null) {
      let organization = emailArray[1];
      payload["organization"] = organization;
      console.log("Retreived Organization on User: " + organization);
    }
  });
}

// Calculate the time until we need to run another test based on
// run_time_minutes: time to start running the tests each day
// frequency_minutes: how often we should run the test in minutes
function calcTimeToNextRunMilliseconds(run_time_minutes, frequency_minutes) {
  // Calculate the timing for the next speed test
  // Get current time minutes
  var current = new Date();
  // Calculate the current time in minutes
  var currentTimeMinutes = current.getHours() * 60 + current.getMinutes();

  // Calculate the time since we last ran a speed test
  var timeSinceLastRunMinutes =
    (currentTimeMinutes - run_time_minutes) % frequency_minutes;

  // Calculate the time in minutes until we run the next speed test
  var nextRunTimeMinutes = frequency_minutes - timeSinceLastRunMinutes;
  var nextRunTimeMilliseconds = nextRunTimeMinutes * 60000;

  // Setup max range of randomization
  var randomizeRangeMinutes = 10; 
  var maxMilliseconds = randomizeRangeMinutes * 60000;
  // Randomize the next run time between 0 - 10 minutes
  var nextRunTimeMilliseconds =
    Math.random() * maxMilliseconds + nextRunTimeMilliseconds;

  console.log(
    "Running next test in " +
      nextRunTimeMilliseconds.toString() +
      " milliseconds"
  );
  return nextRunTimeMilliseconds;
}

async function fetchConfigData(payload) {
  let response = null;
  let result = null;
  const azureFunctionURL =
    "https://******************";
  // Sub key needs to be replaced when updated in APIM.  NOTE: Will require Extension Re Deployment.
  const azureConfigAPISubKey = "*****************************";

  try {
    // Validate payload
    if (
      typeof payload !== "object" ||
      payload["organization"] === undefined ||
      payload["organization"] === null
    ) {
      console.error(
        "Payload does not contain the required organization value.",
        payload
      );
      return result;
    }

    // post for config results
    response = await fetch(azureFunctionURL, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        "Ocp-Apim-Subscription-Key": azureConfigAPISubKey,
      },
      body: JSON.stringify(payload),
    });
    result = await response.json();
  } catch {
    console.log("Initial call to Azure Function Failed");
    try {
      console.log("Trying Config Call Again");
      // post for config results
      response = await fetch(azureFunctionURL, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json;charset=utf-8",
          "Ocp-Apim-Subscription-Key": azureConfigAPISubKey,
        },
        body: JSON.stringify(payload),
      });
      result = await response.json();
    } catch {
      console.log("Second call to Azure Function Failed");
    }
  }
  return result;
}

// Create the popup window where the qoi test runs
function openQoiWindow() {
  chrome.windows.create({
    focused: false,
    url: "popup.html",
  });
}

var networkTester = {
  // Sets up the next test based on the config setup in Azure Portal
  setupNextTestHandler: async function () {
    let configResponse = await fetchConfigData(payload);

    // Our attempt to fetch failed - try to get the config from storage
    if (configResponse === null) {
      chrome.storage.local.get(["configData"], async function (result) {
        let currConfig = result.configData;

        if (
          currConfig === null ||
          currConfig === undefined ||
          typeof currConfig !== "object"
        ) {
          console.error(
            "No cached config and we failed to get it from the API. Trying again in one hour."
          );
          // Try again in an hour
          // Note: This is a different alarm so that we don't open the QOI window every hour
          chrome.alarms.create("configFetchAlarm", {
            when: Date.now() + ONE_HOUR,
          });
        } else {
          console.log("Had a cached config. Starting test.");
          var nextRunTimeMilliseconds = calcTimeToNextRunMilliseconds(
            currConfig.Run_Time_Minutes,
            currConfig.Frequency_Minutes
          );
          // Set the alarm and convert minutes to milliseconds
          chrome.alarms.create("collectionAlarm", {
            when: Date.now() + nextRunTimeMilliseconds,
          });
        }
      });
    } else {
      // Store our new configuration
      chrome.storage.local.set({ configData: configResponse }, function () {
        console.log(
          "Stored the updated config data in local storage, starting test."
        );
        // Get Next run time
        var nextRunTimeMilliseconds = calcTimeToNextRunMilliseconds(
          configResponse.Run_Time_Minutes,
          configResponse.Frequency_Minutes
        );
        // Set the next alarm
        chrome.alarms.create("collectionAlarm", {
          when: Date.now() + nextRunTimeMilliseconds,
        });
      });
    }
  },
};

// When application is first installed, turn on the network tester
chrome.runtime.onInstalled.addListener(async function () {
  await networkTester.setupNextTestHandler();
});

// When application is started, turn on the network tester
chrome.runtime.onStartup.addListener(async function () {
  await networkTester.setupNextTestHandler();
});

// When the alarm goes off, gather all the data
chrome.alarms.onAlarm.addListener(async function (alarm) {
  // Only trigger the speedtest window if the alarm is the collection alarm.
  if (alarm.name === "collectionAlarm") {
    openQoiWindow();
  }
  // Setup the next network test alarm
  await networkTester.setupNextTestHandler();
});
