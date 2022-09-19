// BEGIN SCRIPT EXECUTION
let payload = {}; // Object to hold data payload
let apiKey = null;
let axios = require("axios");
startNewTest(payload);
// END SCRIPT EXECUTION

// Returns a promise that resolves in  milli milliseconds, used to wait before moving forward
function wait(milli) {
  return new Promise((resolve) => {
    setTimeout(resolve, milli);
  });
}

// Helper function to wait ten seconds and close the current window
async function waitAndClose() {
  await wait(10000);
  window.close();
}

// Post a result to the database by sending it to the postQoIData API
// Return true or false to indicate success or failure so that caller can respond appropriately.
async function sendResultToDatabase(payload) {
  return axios({
    method: "post",
    url: "https://fs-myqoi-*****************",
    data: payload,
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      "Ocp-Apim-Subscription-Key": apiKey,
    },
  })
    .then((response) => {
      console.log(response);
      return true;
    })
    .catch((error) => {
      console.error(error);
      return false;
    });
}

// This function should be run on startup of this window every time a test is about to begin.
// It looks for failed tests and sends them back to the database one by one
function sendPastFailedTests() {
  chrome.storage.local.get(["failedTests"], async function (result) {
    let failedTests = result.failedTests;
    // We either have no failed tests or garbage ended up in storage, can't send anything right now
    if (
      failedTests === null ||
      failedTests === undefined ||
      typeof failedTests !== "object" ||
      failedTests.constructor !== Array
    ) {
      return;
    }

    // Loop through each failed test and attempt to post it to the database, removing them on success
    // Note: we use a reverse for loop here because it makes it easier to remove elements from the list as we iterate
    for (let i = failedTests.length - 1; i >= 0; i--) {
      let test = failedTests[i];
      let success = await sendResultToDatabase(test);
      if (success) {
        // posted result to database, remove it from the list so that we remove it from storage,
        failedTests.splice(i, 1); // Remove current element
      }
    }

    chrome.storage.local.set({ failedTests: failedTests }, function () {
      console.log(
        "Sent failed tests to database, there are currently " +
          failedTests.length +
          " in storage."
      );
    });
  });
}

// Store a failed test result in local storage so that it can be sent later
function storeFailedTest(payload) {
  chrome.storage.local.get(["failedTests"], function (result) {
    let failedTests = result.failedTests;
    // Validate the current failedTests value to see if we need to completely override
    // Current value should either not exist or has some garbage in it (not an array)
    if (
      failedTests === null ||
      failedTests === undefined ||
      typeof failedTests !== "object" ||
      failedTests.constructor !== Array
    ) {
      failedTests = []; // Replace with a blank array to start from scratch
    }

    // Add the provided failed test to the current list of failed tests
    failedTests.push(payload);
    chrome.storage.local.set({ failedTests: failedTests }, function () {
      console.log(
        "Stored a new failed test, there are currently " +
          failedTests.length +
          " in storage."
      );
    });
  });
}

// Attempts to post the payload back to the database, but on failure sends it to local storage.
// Closes the current window when finished
async function postResultAndClose(payload) {
  // post data to backend
  let success = await sendResultToDatabase(payload);
  if (!success) {
    // TODO - we could do a better job making sure this returns before closing the window
    //        but waiting 10 seconds should realistically be enough
    storeFailedTest(payload);
  }

  // Data collection complete - close the window after 10 seconds.
  // TODO - make a visual countdown
  waitAndClose();
}

// QOI TEST FUNCTIONS
// ------------------
// These run from top to bottom in order, each one on completion calls the next
// At each step we replace a failure (usually empty string) with null to make failures clear in the db.
// ----------------------------------------------------------------------------------------------------

// Kicks off a new test by attempting to fetch an API Key from storage, which is required to move forward
// On success begins the chain into the next function.
function startNewTest(payload) {
  chrome.storage.local.get(["configData"], function (result) {
    let configData = result.configData;
    if (
      configData === null ||
      configData === undefined ||
      typeof configData !== "object"
    ) {
      console.error("No config data in storage. Necessary to run QoI test.");
      return waitAndClose();
    }

    apiKey = configData.Api_Key;
    if (apiKey === null || apiKey === undefined || typeof apiKey !== "string") {
      console.error(
        "No API key in stored configData. Necessary to send results to database."
      );
      return waitAndClose();
    }

    // We still need an API key to try to send past failed tests
    sendPastFailedTests();

    getUserInfo(payload);
  });
}

// Get id and email
function getUserInfo(payload) {
  chrome.identity.getProfileUserInfo((info) => {
    if (info.email) {
      const emailArray = info.email.split("@") ?? null;
      if (emailArray && emailArray.length >= 2) {
        payload["organization"] = emailArray[1];
      }
    }
    payload["id"] = info.id ?? null;
    getHardwareInformation(payload); // Chain into next step
  });
}

// Fetch all machine-specific identifiers
async function getHardwareInformation(payload) {
  // Get operating system
  payload["os"] = navigator.userAgentData.platform ?? null;

  try {
    // Get manufacturer and model
    let hardwareInfo =
      await chrome.enterprise.hardwarePlatform.getHardwarePlatformInfo();
    payload["manufacturer"] = hardwareInfo.manufacturer ?? null;
    payload["model"] = hardwareInfo.model ?? null;
  } catch (error) {
    payload["manufacturer"] = null;
    payload["model"] = null;
    console.log(`Unable to obtain hardware information: ${error}`);
  }

  try {
    let cpuInfo = await chrome.system.cpu.getInfo();
    payload["arch"] = cpuInfo.archName ?? null;
  } catch (error) {
    payload["arch"] = null;
    console.log(`Unable to obtain cpu information: ${error}`);
  }

  // This API only works on Chrome OS, check platform before running
  if (navigator.userAgentData.platform == "Chrome OS") {
    try {
      chrome.enterprise.deviceAttributes.getDeviceSerialNumber((serialNumber) => {
        payload["serial_no"] = serialNumber ?? null;
      });
    } catch (error) {
      payload["serial_no"] = null;
      console.log(`Unable to obtain device attributes: ${error}`);
    }
  } else {
    console.log("Device is not a Chromebook, unable to retrieve serial number");
    payload["serial_no"] = null;
  }

  getLocation(payload); // Chain into next step
}

// Geolocation data
function getLocation(payload) {
  navigator.geolocation.getCurrentPosition(
    (info) => {
      let lat = info.coords.latitude ?? null;
      let lng = info.coords.longitude ?? null;
      // Randomize location within a few households to make data less identifiable
      if (lat && lng) {
        const randLatLng = randomizeLocation(lat, lng);
        lat = randLatLng[0];
        lng = randLatLng[1];
      }
      payload["latitude"] = lat;
      payload["longitude"] = lng;

      getNetworkIdentifiers(payload);
    },
    (err) => {
      // This request can fail due to user permissions
      console.error(err);
      payload["latitude"] = null;
      payload["longitude"] = null;
      getNetworkIdentifiers(payload);
    }
  );
}

// Fetch network-specific identifiers
function getNetworkIdentifiers(payload) {
  try {
    // Get ip addresses and mac address
    chrome.enterprise.networkingAttributes.getNetworkDetails((info) => {
      payload["mac_address"] = info.macAddress ?? null;
      runSpeedtest(payload);
    });
  } catch (error) {
    console.log(`Unable to obtain networking attributes: ${error}`);
    payload["mac_address"] = null;
    runSpeedtest(payload);
  }
}

// run ookla speedtest
async function runSpeedtest(payload) {
  var ookla = require("@ookla/speedtest-js-sdk"); // We need to be in a window to import ookla

  // Used to close the window if a test takes way too long to start - sign of uncaught crash in ookla engine
  let testStarted = false;
  // Initialize payload values to null for sending back to db in failure cases
  payload["latency"] = null;
  payload["download_speed"] = null;
  payload["upload_speed"] = null;
  payload["public_ip"] = null;
  payload["isp"] = null;

  const ooklaConfig = {
    engine: "js",
    automaticTest: true,
    jsEngine: {
      savePath: "/report",
      saveType: "sdk",
    },
    saveResults: false,
    apiKey: "*********",
    sdkBaseUrl: "https://myqoi.speedtestcustom.com/",
  };
  ookla.EngineApi.configure(ooklaConfig);

  // ENGINE LISTENERS FROM OOKLA DEMO
  ookla.EngineApi.onStarted.add(() => {
    testStarted = true;
    console.log("onStarted");
  });
  ookla.EngineApi.onCanceled.add(() => {
    console.log("Speedtest cancelled.");

    // post results on cancellation
    postResultAndClose(payload);
  });
  ookla.EngineApi.onProgress.add((stageName, result) => {
    console.log(
      `${stageName} ${Math.floor(result.speed)} Bps (${Math.floor(
        result.ratioComplete * 100
      )}%)`
    );
  });
  ookla.EngineApi.onStageFinished.add((stageName, result) => {
    console.log(
      `onStageFinished(stageName = ${stageName}, result = ${JSON.stringify(
        result
      )})`
    );
  });
  ookla.EngineApi.onError.add((errorKey, errorMessage, errorObject) => {
    console.log(
      `onError: errorKey = ${errorKey}, errorMessage = ${errorMessage}, errorObject = ${JSON.stringify(
        errorObject
      )}`
    );
    // Test failed, send result to database
    postResultAndClose(payload);
  });
  ookla.EngineApi.onResultSaved.add((saveResult, testResult) => {
    console.log(
      `onResultSaved saveResult = ${JSON.stringify(
        saveResult
      )} testResult = ${JSON.stringify(testResult)}`
    );

    // Lookup enriched data from Ookla database so that we have access to ISP information.
    ookla.EngineApi.lookupSpeedtestResult(testResult.guid).then((result) => {
      payload["latency"] = testResult.ping ?? null;
      payload["download_speed"] = testResult.download ?? null;
      payload["upload_speed"] = testResult.upload ?? null;
      payload["public_ip"] = testResult.clientip ?? null;
      payload["isp"] = result.ispName ?? null;

      postResultAndClose(payload);
    });
  });
  // END LISTENERS

  // Start test stages
  ookla.EngineApi.startTest();

  // If we have yet to start the test after 10 seconds then we very likely crashed
  await wait(30000);
  if (!testStarted) {
    await postResultAndClose(payload);
  }
}

/*
 * Vincenty Direct Solution of Geodesics on the Ellipsoid (c) Chris Veness
 * 2005-2012
 *
 * from: Vincenty direct formula - T Vincenty, "Direct and Inverse Solutions
 * of Geodesics on the Ellipsoid with application of nested equations", Survey
 * Review, vol XXII no 176, 1975 http://www.ngs.noaa.gov/PUBS_LIB/inverse.pdf
 */
// Randomize the latitude and longitude that get stored in order to prevent identification
// of the user.
// https://stackoverflow.com/a/13867009 - methodology found here
function randomizeLocation(lat, lon) {
  let brng = Math.random() * 360; // Random bearing (decimal degrees)
  let dist = 15 + Math.random() * 40; // Random distance (distance along bearing in meters), at least 15 meters away and up to 55
  let results = [];

  let a = 6378137,
    b = 6356752.3142,
    f = 1 / 298.257223563; // WGS-84 ellipsiod

  let s = dist;
  let alpha1 = toRad(brng);
  let sinAlpha1 = Math.sin(alpha1);
  let cosAlpha1 = Math.cos(alpha1);

  let tanU1 = (1 - f) * Math.tan(toRad(lat));
  let cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1),
    sinU1 = tanU1 * cosU1;
  let sigma1 = Math.atan2(tanU1, cosAlpha1);
  let sinAlpha = cosU1 * sinAlpha1;
  let cosSqAlpha = 1 - sinAlpha * sinAlpha;
  let uSq = (cosSqAlpha * (a * a - b * b)) / (b * b);
  let A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  let B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  let sinSigma = 0,
    cosSigma = 0,
    deltaSigma = 0,
    cos2SigmaM = 0;
  let sigma = s / (b * A),
    sigmaP = 2 * Math.PI;

  while (Math.abs(sigma - sigmaP) > 1e-12) {
    cos2SigmaM = Math.cos(2 * sigma1 + sigma);
    sinSigma = Math.sin(sigma);
    cosSigma = Math.cos(sigma);
    deltaSigma =
      B *
      sinSigma *
      (cos2SigmaM +
        (B / 4) *
          (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
            (B / 6) *
              cos2SigmaM *
              (-3 + 4 * sinSigma * sinSigma) *
              (-3 + 4 * cos2SigmaM * cos2SigmaM)));
    sigmaP = sigma;
    sigma = s / (b * A) + deltaSigma;
  }

  let tmp = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1;
  let lat2 = Math.atan2(
    sinU1 * cosSigma + cosU1 * sinSigma * cosAlpha1,
    (1 - f) * Math.sqrt(sinAlpha * sinAlpha + tmp * tmp)
  );
  let lambda = Math.atan2(
    sinSigma * sinAlpha1,
    cosU1 * cosSigma - sinU1 * sinSigma * cosAlpha1
  );
  let C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
  let L =
    lambda -
    (1 - C) *
      f *
      sinAlpha *
      (sigma +
        C *
          sinSigma *
          (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
  let lon2 = ((toRad(lon) + L + 3 * Math.PI) % (2 * Math.PI)) - Math.PI; // normalise to -180...+180

  results.push(toDegrees(lat2));
  results.push(toDegrees(lon2));
  return results;
}

function toRad(angle) {
  return (angle * Math.PI) / 180;
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}
