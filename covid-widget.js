const OPEN_TO_URL = 'https://novascotia.ca/coronavirus/data/';
const CASE_DATA_API = 'https://services7.arcgis.com/guiEgv5T1fmjU8SW/arcgis/rest/services/BND_NSH_MZones_V4_Join_PROD/FeatureServer/1/';
const TEST_DATA_API = 'https://services7.arcgis.com/guiEgv5T1fmjU8SW/arcgis/rest/services/Lab_Testing_MaxDate_V4_PROD/FeatureServer/0/';

const caseData = await loadCaseData(CASE_DATA_API, TEST_DATA_API);

let widget = caseData != null ? await createWidget(caseData) : await createErrorWidget();

if (config.runsInWidget) {
    // The script runs inside a widget, so we pass our instance of ListWidget to be shown inside the widget on the Home Screen.
    Script.setWidget(widget);
} else {
    // The script runs inside the app, so we preview the widget.
    widget.presentSmall();
}

Script.complete();


function createErrorWidget() {
    const wg = new ListWidget();
    wg.backgroundColor = Color.red();
    const err = wg.addText("Error :(");
    err.font = Font.semiboldMonospacedSystemFont(35);
    return wg;
}

async function createWidget(caseData) {
    const wg = new ListWidget();

    // url to visit when clicking on widget
    wg.url = OPEN_TO_URL;

    // background color gradient
    const bgGradient = new LinearGradient();
    bgGradient.colors = [new Color("4e7eff"), new Color("2d79ff")];
    bgGradient.locations = [0.0, 1];
    wg.backgroundGradient = bgGradient

    // color of the text on the widget
    const textColor = new Color("fff");

    // Header text
    const header = wg.addText("New Cases");
    header.font = Font.semiboldMonospacedSystemFont(16);
    header.textColor = textColor;

    // new cases text
    const newCasesText = wg.addText(caseData.newCases.toString());
    newCasesText.font = Font.semiboldSystemFont(50);
    newCasesText.textColor = textColor;

    // stack for active cases so we can have dynamic color for +/-
    const activeStack = wg.addStack();
    // total active cases
    const activeCasesText = activeStack.addText(`${caseData.activeCases} active cases `);
    activeCasesText.font = Font.semiboldMonospacedSystemFont(12);
    activeCasesText.textColor = textColor;
    // add the change in active cases
    if (caseData.deltaActiveCases) {
        const deltaActiveCasesText = activeStack.addText(`(${caseData.deltaActiveCases.text})`);
        deltaActiveCasesText.font = Font.semiboldMonospacedSystemFont(12);
        deltaActiveCasesText.textColor = caseData.deltaActiveCases.color;
        wg.addSpacer(5);
    }

    // new tests
    const newTestsText = wg.addText(`${caseData.newTests} new tests`);
    newTestsText.font = Font.semiboldMonospacedSystemFont(12);
    newTestsText.textColor = textColor;
    wg.addSpacer(5);

    // last updated
    const lastUpdatedText = wg.addText(caseData.lastUpdated);
    lastUpdatedText.font = Font.boldMonospacedSystemFont(10);
    lastUpdatedText.textColor = Color.black();

    return wg
}

async function loadCaseData(caseDataApi, testDataApi) {
    // loads the CSV as a string
    const caseData = await makeApiRequest(caseDataApi);
    const testData = await makeApiRequest(testDataApi, where='1=1');

   
    if (!caseData || !testData) {
        return null;
    }

    const lastUpdated = new Date(caseData.report_dat).toDateString();
    const newCases = caseData.new_cases;
    const activeCases = caseData.act_cases;
    const newTests = testData.tests_day;
    // WIP: change in active cases

    return {
        lastUpdated,
        newCases,
        activeCases,
        newTests,
    };
}

async function makeApiRequest(
    url,
    where = 'zone=\'NS\'',
    returnGeometry = false,
    spatialRel = 'esriSpatialRelIntersects',
    outFields = '*',
    resultOffset = 0,
    resultRecordCount = 50,
    resultType = 'standard',
    cacheHint = true,
) {
   
    const query = {
        f: 'json',
        where,
        returnGeometry,
        spatialRel,
        outFields,
        resultOffset,
        resultRecordCount,
        resultType,
        cacheHint,
    };

    const queryString = Object.keys(query)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
    .join('&');

    try {
        const res = await new Request(url + 'query?' + queryString).loadJSON();
        return res.features[0].attributes;
    } catch {
        return null;
    }
}