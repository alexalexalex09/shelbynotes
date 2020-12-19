//Create the main layout
var el =
  `
<div id="pn_noteButton" onclick="pn_show()">Show Private Note</div>
<div id="pn_notification" class="off"></div>
<div id="pn_noteContainer" class="off">
  <div id="pn_name">` +
  document.querySelector(".page-top-title .pg-title").innerText +
  `</div>` +
  `<button id="pn_fullscreen"><i class="fas fa-expand-arrows-alt"></i></button><button id="pn_exitFullscreen" class="off"><i class="fas fa-compress-arrows-alt"></i></button>` +
  `<button id="pn_closeButton" class="pn_button" onclick="pn_hide()">Close Notes</button>` + //Note: this only works because pn_hide() doesn't need to access any functions or variables
  `<button id="pn_exportButton" class="pn_button">Export All Notes</button>` +
  `<div id="pn_exportButtons" class="off"> <button id="pn_hideExport" class="pn_button">Cancel Export</button>` +
  `<button id="pn_showPrint" class="pn_button">Print</button>` +
  `<button id="pn_download" class="pn_button">Download</button></div>` +
  `<div id="pn_entries"></div>` +
  `<div id="pn_unsaved"></div>` +
  `<div id="pn_counter" class="off">0</counter>` +
  `</div>`;
el = `<div id="pn_container">` + el + `</div>`;
document.body.appendChild(pn_htmlToElem(el));

//Get entries from Google storage and local storage
pn_getAllEntries();
document.querySelector("#pn_exportButton").addEventListener("click", pn_export);
document
  .querySelector("#pn_hideExport")
  .addEventListener("click", pn_hideExport);
document.querySelector("#pn_showPrint").addEventListener("click", pn_showPrint);
document.querySelector("#pn_download").addEventListener("click", pn_download);
document
  .querySelector("#pn_fullscreen")
  .addEventListener("click", pn_fullscreen);
document
  .querySelector("#pn_exitFullscreen")
  .addEventListener("click", pn_exitFullscreen);

/**************/
/* Functions  */
/**************/
//Given an HTML string, return an DOM element
function pn_htmlToElem(html) {
  let temp = document.createElement("template");
  html = html.trim(); // Never return a space text node as a result
  temp.innerHTML = html;
  return temp.content.firstChild;
}

//Show the main note container
function pn_show() {
  document.querySelector("#pn_noteContainer").classList.remove("off");
}

//hide the note container, leaving only the button visible
function pn_hide() {
  document.querySelector("#pn_noteContainer").classList.add("off");
}

function pn_fullscreen() {
  document.querySelector("#pn_noteContainer").classList.add("fullscreen");
  document.querySelector("#pn_fullscreen").classList.add("off");
  document.querySelector("#pn_exitFullscreen").classList.remove("off");
}

function pn_exitFullscreen() {
  document.querySelector("#pn_noteContainer").classList.remove("fullscreen");
  document.querySelector("#pn_fullscreen").classList.remove("off");
  document.querySelector("#pn_exitFullscreen").classList.add("off");
}

//get the ID string from the URL of the page
function pn_getID() {
  var url = window.location.href;
  var id = url.substr(url.lastIndexOf("/") + 1);
  id = id.replace(/[^0-9]/, "");
  return id;
}

//Get entries from Google storage and local storage
function pn_getAllEntries() {
  var id = pn_getID();

  //uncomment to clear chrome storage
  /*chrome.storage.sync.remove(id, function () {
    localStorage.removeItem(id);
  });*/
  //end clear storage

  //Get any unsaved draft text from local storage
  var localText = localStorage.getItem(id);
  //initialize entries array
  var entries = [];

  //If there is a draft
  if (localText != null) {
    //Set a draft notification ("!") and show the notification
    pn_notify("!");

    //initialize getStorage to false
    getStorage = false;
    var divider = localText.indexOf("|"); //Where is the divider between the entry indicator and text content in local storage?
    var index = localText.substr(0, divider); //Get the entry indicator
    var localText = localText.substr(divider + 1); // Remove the index from localText
    divider = localText.indexOf("|"); // Get the next divider
    var draftDate = localText.substr(0, divider); //Get the draft date
    localText = localText.substr(divider + 1); //Remove the date from localText, leaving only text

    //Add the draft entry to the entries list, is now the only entry
    //entries.push({ date: "Draft", text: localText });

    //Assign the draft to the draft object
    var draft = { index: index, text: localText, date: draftDate };

    //Show the draft interface and bind events
    document.querySelector(
      "#pn_unsaved"
    ).innerHTML = `Unsaved changes have been recovered.`;

    //Get the rest of the entries
    pn_getSyncStorage(entries, draft);
  } else {
    //If there is no draft, just get the entries
    pn_getSyncStorage(entries);
  }
}

//If there is unsaved work, notify the user before they navigate away
/*window.addEventListener("beforeunload", function (ev) {
  var draft = localStorage.getItem(pn_getID());
  if (draft != null || draft != "") {
    ev.preventDefault(); //prevent navigating away
    ev.returnValue = ""; //Chrome requires this
  }
});*/

//Function to sort by date field (as String) descending
function pn_dateSort(a, b) {
  a = new Date(a.date);
  b = new Date(b.date);
  return b - a;
}

//Get the current time and format it before returning a string
function getNowString() {
  //Get current time for the default draft entry
  var now = new Date();
  return now.toLocaleDateString() + " " + now.toLocaleTimeString();
}

//Get entries from Google Sync storage
function pn_getSyncStorage(entries, draft = { index: -1, text: "", date: "" }) {
  var id = pn_getID();
  chrome.storage.sync.get([id], function (obj) {
    var nowString = getNowString();

    //Initialize firstEntry to false
    var firstEntry = false;
    if (
      obj == null ||
      typeof obj == "undefined" ||
      typeof obj[id] == "undefined" // Need to test if an empty object was returned
    ) {
      //If there is no object, or it's not correctly formatted, there are no entries
      firstEntry = true;
    } else {
      //if an entry has been found
      //get the relevant individual's info
      obj = JSON.parse(obj[id]);

      //If there are no notes for that person, this is the first entry
      if (obj.notes.length == 0) {
        firstEntry = true;
      }
    }

    //Now that we know if this is the first entry or not, initialize the entries
    if (firstEntry) {
      // Only remove the notification if there is no draft

      if (Number(draft.index) != 0) {
        //This tests to see if we added a draft to entries in pn_getAllEntries()
        //If the draft wasn't the first entry (in this case it could only be 0 or -1), initialize the first entry as a blank draft
        pn_notify("");
        document.querySelector("#pn_entries").innerHTML =
          `<div class="draft pn_entry"><div class="date">` +
          nowString +
          `</div><form class="pn_previewText"><textarea></textarea><input type="submit" value="Save"></input><button>Cancel</button></form></div>`;
        bindEntries();
      } else {
        //If the first entry was a draft, put the text from the first array item in entries (the draft) into the first entry on the page
        document.querySelector("#pn_entries").innerHTML =
          `<div class="pn_entry"><div class="date">` +
          draft.date +
          `</div><form class="pn_previewText editing"><textarea>` +
          draft.text +
          `</textarea><input type="submit" value="Save"></input><button>Cancel</button></form></div>`;
        bindEntries();
      }

      //Since this is the first entry for this individual, we don't need to do anything else
      return null;
    } else {
      //If this isn't the first entry for this individual:
      //set the notification
      if (document.querySelector("#pn_notification").innerHTML != "!") {
        pn_notify(obj.notes.length);
      }

      //Sort notes from Sync by date
      obj.notes.sort(pn_dateSort);
      //Add sync notes to the existing draft in the draft, if any
      entries = entries.concat(obj.notes);

      //Create the HTML string to insert into the main area

      var entryString = ``;

      //if the draft entry was the first entry, put its text in the first entry
      if (Number(draft.index) == 0) {
        entryString +=
          `<div class="draft pn_entry"><div class="date">` +
          draft.date +
          `</div><form class="pn_previewText editing"><textarea>` +
          draft.text +
          `</textarea><input type="submit"></input><button>Cancel</button></form></div>`;
      } else {
        //if not, set the first entry to be blank
        entryString +=
          `<div class="draft pn_entry"><div class="date">` +
          nowString +
          `</div><form class="pn_previewText"><textarea></textarea><input type="submit" value="Save"></input><button>Cancel</button></form></div>`;
      }

      //Draft index didn't include the extra draft element we inserted on this page load, so reduce it by one
      draft.index = Number(draft.index) - 1;
      //Then iterate over the rest, adding them to the string
      entries.forEach((e, i) => {
        if (i == draft.index) {
          entryString += entryStringGen(draft, true);
        } else {
          entryString += entryStringGen(e);
        }
      });

      //Finally, insert the string and bind all the events
      document.querySelector("#pn_entries").innerHTML = entryString;
      bindEntries();
    }
  });
}

//Generate a generic entry as an HTML string
function entryStringGen(entry, editing = false) {
  if (editing) {
    editing = " editing";
  } else {
    editing = "";
  }
  return (
    `<div class="pn_entry"><div class="date">` +
    entry.date +
    `</div><form class="pn_previewText` +
    editing +
    `"><textarea>` +
    entry.text +
    `</textarea><input type="submit" value="Save"></input><button>Cancel</button></form><div class="pn_delete">x</div></div>`
  );
}

//Go back to the main entry interface when done editing
function stopEditing(ev) {
  ev.preventDefault();
  //Check if the local save of the current Draft (before editing) is the same as the current value (i.e., there have been no changes)
  if (
    localStorage.getItem("currentDraft") !=
    ev.currentTarget.parentElement.children[0].value
  ) {
    //If there have been changes, make the user confirm the discard
    var res = confirm("Are you sure you want to discard unsaved changes?");
    if (res) {
      //If they confirm, revert the element to its previous value as recorded by the currentDraft item in local storage
      ev.currentTarget.parentElement.children[0].value = localStorage.getItem(
        "currentDraft"
      );
      document.querySelector(".pn_previewText.editing textarea").scrollTo(0, 0);
      ev.currentTarget.parentElement.classList.remove("editing");
      if (document.querySelector("#pn_unsaved") != null) {
        document.querySelector("#pn_unsaved").remove();
      }
    }
  } else {
    if (document.querySelector("#pn_unsaved") != null) {
      document.querySelector("#pn_unsaved").remove();
    }
    document.querySelector(".pn_previewText.editing textarea").scrollTo(0, 0);
    ev.currentTarget.parentElement.classList.remove("editing");
  }
}

function prepSave(ev) {
  ev.preventDefault();
  document.querySelector(".pn_previewText.editing textarea").scrollTo(0, 0);
  ev.currentTarget.classList.remove("editing");
  if (ev.currentTarget.parentElement.children[0].innerHTML == "Draft") {
    date = new Date(Date.now());
  } else {
    var date = new Date(ev.currentTarget.parentElement.children[0].innerHTML);
  }
  var dateString = date.toLocaleDateString() + " " + date.toLocaleTimeString();
  ev.currentTarget.parentElement.classList.remove("editing");
  var entries = ev.currentTarget.parentNode.parentNode.children;
  var index = Array.from(entries).indexOf(ev.currentTarget.parentNode);
  index = entries.length - index - 1;
  if (index == entries.length - 1) {
    newest = true;
  } else {
    newest = false;
  }
  return pn_saveData(
    dateString,
    ev.currentTarget.children[0].value,
    index,
    newest
  );
}

function pn_saveData(date, text, index, newest) {
  var id = pn_getID();
  chrome.storage.sync.get([id], function (result) {
    if (typeof result[id] == "undefined") {
      obj = {
        notes: [],
        name: document.querySelector(".page-top-title .pg-title").innerText,
      };
    } else {
      obj = JSON.parse(result[id]);
      obj.name = document.querySelector(".page-top-title .pg-title").innerText;
    }
    obj.notes.sort(pn_dateSort);
    obj.notes[index] = { date: date, text: text };
    str = JSON.stringify(obj);
    var toSave = {};
    toSave[id] = str;
    chrome.storage.sync.set(toSave, function () {
      localStorage.removeItem(id);
      if (document.querySelector("#pn_unsaved") != null) {
        document.querySelector("#pn_unsaved").remove();
      }
      if (newest) {
        if (document.querySelector(".draft") != null) {
          document.querySelector(".draft .date").innerHTML = date;
          document.querySelector(".draft").classList.remove("draft");
          if (document.querySelector("#pn_unsaved") != null) {
            document.querySelector("#pn_unsaved").remove();
          }
        }
        pn_addNewRow();
      }
      //pn_getSyncStorage();
    });
  });
  return false;
}

function startEditing(ev) {
  if (!ev.currentTarget.parentElement.classList.contains("editing")) {
    ev.currentTarget.parentElement.classList.add("editing");
    localStorage.setItem("currentDraft", ev.currentTarget.value);
    var a = ev.currentTarget.parentElement.parentElement;
  }
}

function textChanges(ev) {
  var id = pn_getID();
  var text = ev.currentTarget.value;
  //Get the index of the current .pn_entry item
  var index = Array.from(
    ev.currentTarget.parentElement.parentElement.parentElement.children
  ).indexOf(ev.currentTarget.parentElement.parentElement);
  //Get the date of the current .pn_entry item
  var date = ev.currentTarget.parentElement.parentElement.children[0].innerHTML;
  localStorage.setItem(id, index + "|" + date + "|" + text);
}

function entryDelete(ev) {
  var id = pn_getID();
  var entry = ev.currentTarget.parentNode;
  var el = ev.currentTarget;
  var index = Array.from(entry.parentNode.children).indexOf(entry) - 1;
  if (index > -1) {
    chrome.storage.sync.get([id], function (result) {
      if (typeof result[id] == "undefined") {
        obj = { notes: [] };
      } else {
        obj = JSON.parse(result[id]);
      }
      obj.notes.sort(pn_dateSort);
      obj.notes.splice(index, 1);
      str = JSON.stringify(obj);
      var toSave = {};
      toSave[id] = str;
      chrome.storage.sync.set(toSave, function () {
        localStorage.removeItem(id);
        el.parentElement.remove();
        pn_notify(document.querySelectorAll(".pn_entry").length - 1);
        //pn_getSyncStorage();
      });
    });
  } else {
    //just erase the first text element. Or maybe remove the delete button so this doesn't even get called
  }
}

function bindEntries() {
  document.querySelectorAll(".pn_previewText button").forEach((e) => {
    e.removeEventListener("click", stopEditing);
    e.addEventListener("click", stopEditing);
  });
  document.querySelectorAll(".pn_previewText").forEach((e) => {
    e.removeEventListener("submit", prepSave);
    e.addEventListener("submit", prepSave);
  });
  document.querySelectorAll(".pn_previewText textarea").forEach((e) => {
    e.removeEventListener("click", startEditing);
    e.removeEventListener("input", textChanges);
    e.addEventListener("click", startEditing);
    e.addEventListener("input", textChanges);
  });
  document.querySelectorAll(".pn_delete").forEach((e) => {
    e.removeEventListener("click", entryDelete);
    e.addEventListener("click", entryDelete);
  });
}

function pn_addNewRow() {
  var nowString = getNowString();
  var newDelete = document.createElement("div");
  newDelete.classList.add("pn_delete");
  newDelete.innerHTML = "x";
  document.querySelector(".pn_entry").append(newDelete);
  var newEl = document.createElement("div");
  newEl.classList.add("pn_entry");
  newEl.innerHTML =
    `<div class="date">` +
    nowString +
    `</div><form class="pn_previewText"><textarea></textarea><input type="submit" value="Save"></input><button>Cancel</button></form>`;
  document.querySelector("#pn_entries").prepend(newEl);
  pn_notify(document.querySelectorAll(".pn_entry").length - 1);
  bindEntries();
}

function pn_notify(notification) {
  if (notification == "" || Number(notification) == 0) {
    document.querySelector("#pn_notification").classList.add("off");
  } else {
    document.querySelector("#pn_notification").innerHTML = notification;
    document.querySelector("#pn_notification").classList.remove("off");
  }
}

function pn_export() {
  document.querySelector("#pn_exportButtons").classList.remove("off");
  document.querySelector("#pn_exportButton").classList.add("off");
}

function pn_hideExport() {
  document.querySelector("#pn_exportButtons").classList.add("off");
  document.querySelector("#pn_exportButton").classList.remove("off");
}

async function pn_download() {
  pn_prepareCSV().then((csv) => {
    pn_createCSV("shelby_private_notes.csv", csv);
  });
}

function pn_prepareCSV() {
  var promise = new Promise((resolve, reject) => {
    chrome.storage.sync.get(null, function (obj) {
      var csv = [];
      //Look through each individual's entry
      for (let [k, v] of Object.entries(obj)) {
        var person = JSON.parse(v);
        var name = "";

        //Get the name, if any, or the number if the name is undefined (saved in previous version)
        if (typeof person.name != "undefined") {
          name = person.name;
        } else {
          name = k;
        }

        //If the individual has notes
        if (typeof person.notes != "undefined") {
          //Loop through each note and add it as a row
          person.notes.forEach((note) => {
            csv.push([name, note.date, note.text]);
          });
        }
      }
      resolve(csv);
    });
  });
  return promise;
}

function pn_createCSV(filename, rows) {
  var processRow = function (row) {
    var finalVal = "";
    for (var j = 0; j < row.length; j++) {
      var innerValue = row[j] === null ? "" : row[j].toString();
      if (row[j] instanceof Date) {
        innerValue = row[j].toLocaleString();
      }
      var result = innerValue.replace(/"/g, '""');
      if (result.search(/("|,|\n)/g) >= 0) result = '"' + result + '"';
      if (j > 0) finalVal += ",";
      finalVal += result;
    }
    return finalVal + "\n";
  };

  var csvFile = "";
  for (var i = 0; i < rows.length; i++) {
    csvFile += processRow(rows[i]);
  }

  var blob = new Blob([csvFile], { type: "text/csv;charset=utf-8;" });
  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    var link = document.createElement("a");
    if (link.download !== undefined) {
      // feature detection
      // Browsers that support HTML5 download attribute
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

async function pn_showPrint() {
  pn_prepareCSV().then((csv) => {
    //Assemble the entries
    var items = ``;
    csv.forEach((row, i) => {
      items +=
        `<div class="entry"><div class="name">` +
        row[0] +
        `</div><div class="date">` +
        row[1] +
        `</div><div class="content">` +
        row[2] +
        `</div></div>`;
    });

    //Create the styles
    var style = `
    html {
      font-family: 'Open Sans';
    }

    #print {
      position: relative;
      margin-top: 1rem;
    }

    #title {
      font-size: 2rem;
      font-weight: bold;
    }

    #noteContainer {
      margin-top: 1rem;
    }

    .entry {
      display: grid;
      grid-template-columns: 12rem 1fr;
      margin-bottom: .5rem;
    }

    .name {
      grid-area: 1/1/2/3;
      font-weight: bold;
      font-size: 1.2rem;
    }

    @media print {
      .noPrint {
          display:none;
        }
      }
    `;

    //Assemble the scripts
    var scripts = `
      function printThis() {
        window.print();
      }
    `;

    //Assemble the final page
    var el =
      `<html>` +
      `<head>` +
      `<title>Shelby Private Notes - Print View</title>` +
      `<style>` +
      style +
      `</style>` +
      `<script type="text/javascript">` +
      scripts +
      `</script>` +
      `</head>` +
      `<body>` +
      `<div id="title">Shelby Private Notes</div>` +
      `<button id="print" class="noPrint" onclick="printThis()">Print</button>` +
      `<div id="noteContainer">` +
      items +
      `</div>` +
      `</body>` +
      `</html>`;
    var printWindow = window.open();
    printWindow.document.write(el);
  });
}

const pn_script = document.createElement("script");
var keyValues = [],
  global = window; // window for browser environments
for (var prop in global) {
  if (prop.indexOf("pn_") == 0)
    // check the prefix
    keyValues.push(global[prop]);
}
pn_script.innerHTML = keyValues.join(" ");
document.head.appendChild(pn_script);

/**************/
/*   Styles   */
/**************/
const pn_style = document.createElement("style");
pn_style.innerHTML = `
#pn_noteContainer {
    position: absolute;
    background: white;
    width: clamp(50%, 50rem, 100%);
    height: max(10%, 15rem);
    border: 2px solid black;
    padding: 5px;
    border-radius: 5px;
    bottom: 0;
    left: 0;
    transition: .1s all;
}

#pn_noteContainer.fullscreen {
  width: 100vw;
  height: 100vh;
}

#pn_textarea {
    height: calc(100% - 2rem);
    width: 100%;
}

#pn_form {    
    height: calc(100% - 1.5rem);
    width: 100%;
}

.off {
    display:none;
}

#pn_fullscreen, #pn_exitFullscreen {
  width: 1rem;
  height: 1rem;
  background-size: contain;
  background-repeat: no-repeat;
  border: none;
  float: right;
  margin-right: 5px;
}

#pn_noteButton {
    position: absolute;
    bottom: 0;
    height: 3rem;
    width: auto;
    background: #006980;
    padding: 15px;
    border-radius: 5px;
    display: grid;
    align-content: center;
    color: white;
    font-size: 1.3rem;
    margin: 3px;
    cursor: pointer;
}

#pn_name {
  float: left;  
  font-weight: bold;
  text-decoration: underline;
}

.pn_button {
  text-align: right;
  color: white;
  cursor: pointer;
  width: auto;
  float: right;
  background-color: #006980;
  padding: 1px 7px;
  border-radius: 3px;
  border: none;
  margin-bottom: 5px;
}

#pn_exportButton, #pn_showPrint, #pn_download, #pn_hideExport {
  margin-right: 5px;
}

#pn_exportButtons {
  transition: .5s all;
}

#pn_unsaved {
  position: absolute;
  color: red;
  font-size: .8em;
  bottom: 5px;
  right: 5px;
}

#pn_discard {
  background: #efefef;
  color: black;
  padding: 0px 2px;
}

#pn_browse {
  float: left;
  height: 1.5rem;
  margin-top: -3px;
  font-size: .7rem;
}

#pn_date {
  float: right;
  font-size: 1rem;
  margin-left: 5px;
}

#pn_notification {
  background-color: red;
  border-radius: 50px;
  position: absolute;
  width: 1.3rem;
  height: 1.3rem;
  bottom: 2.5rem;
  left: 12.5rem;
  text-align: center;
  color: white;
}

#pn_entries {
  display: grid;
  grid-template-columns: 1fr;
  width: 100%;
  row-gap: 5px; 
  max-height: calc(100% - 2rem);
  overflow: auto;
}

.pn_entry {
  display: grid;
  grid-template-columns: 12rem 1fr 1.5rem;
  align-items: center;
}

.date {
  margin-right: 10px;
}

.pn_previewText {
  display: grid;
  align-items: center;
  grid-template-columns: auto auto 1fr;
  grid-template-rows: calc(100% - 2rem) 1fr;
  transition: all .1s
}

.pn_previewText textarea {
  height: 1.7rem;
  overflow: hidden;
  width: 100%;  
  grid-area: 1/1/3/4;
  box-sizing: border-box;
  transition: all .1s;
}

form.pn_previewText.editing {
  position: absolute;
  bottom: 0;
  height: calc(100% - 2.1rem);
  width: calc(100% - 1rem);
  border-right: 5px solid white;
  box-sizing: content-box;
  background-color: white;
}

.pn_previewText.editing textarea {
  height: 100%;
  grid-area: 1/1/2/4;
  overflow: auto;
}

.pn_previewText input, .pn_previewText button {
  display: none;
}

.pn_previewText.editing input, .pn_previewText.editing button{
  display: block
}

.pn_previewText.editing button {
  margin-left: 10px;
  padding: 2px 9px;
  background-color: rgb(239, 239, 239);
  border: 1px solid rgb(118, 118, 118);
  border-radius: 3px;
}

.pn_delete {
  background-color: #006980;
  color: white;
  border-radius: 55px;
  width: 1.1rem;
  height: 1.1rem;
  text-align: center;
  font-size: 0.8rem;
  line-height: 0.9rem;
  justify-self: center;
  cursor: pointer;
}

.editing+.pn_delete {
  display: none;
}

`;
document.head.appendChild(pn_style);
