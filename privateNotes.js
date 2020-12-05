var el = `
<div id="pn_noteButton" onclick="pn_show()">Show Private Note</div>
<div id="pn_notification" class="off"></div>
<div id="pn_noteContainer" class="off">
  <div id="pn_closeButton" onclick="pn_hide()">X</div>
  <div id="pn_entries"></div>
  <div id="pn_unsaved"></div>
  <div id="pn_counter" class="off">0</counter>
</div>
`;
el = `<div id="pn_container">` + el + `</div>`;
document.body.appendChild(pn_htmlToElem(el));
pn_getAllEntries();

/**************/
/* Functions  */
/**************/
/*const scripts = `*/
function pn_htmlToElem(html) {
  let temp = document.createElement("template");
  html = html.trim(); // Never return a space text node as a result
  temp.innerHTML = html;
  return temp.content.firstChild;
}

function pn_show() {
  document.querySelector("#pn_noteContainer").classList.remove("off");
}

function pn_hide() {
  document.querySelector("#pn_noteContainer").classList.add("off");
}

function pn_getID() {
  var url = window.location.href;
  var id = url.substr(url.lastIndexOf("/") + 1);
  id = id.replace(/[^0-9]/, "");
  console.log({ id });
  return id;
}

function pn_getAllEntries() {
  var id = pn_getID();

  //clear chrome storage
  /*chrome.storage.sync.remove(id, function () {
    localStorage.removeItem(id);
    console.log("Value is cleared");
  });*/
  //end clear storage

  var localText = localStorage.getItem(id);
  var entries = [];
  if (localText != null) {
    document.querySelector("#pn_notification").innerHTML = "<i>!</i>";
    document.querySelector("#pn_notification").classList.remove("off");
    getStorage = false;
    console.log({ localText });
    entries.push({ date: "Draft", text: localText });
    document.querySelector(
      "#pn_unsaved"
    ).innerHTML = `Unsaved changes have been recovered. <button id="pn_discard">Discard Changes</button>`;
    document
      .querySelector("#pn_discard")
      .addEventListener("click", function () {
        var res = confirm("Are you sure you want to discard unsaved changes?");
        if (res) {
          localStorage.removeItem(id);
          getStorage = true;
          document.querySelector("#pn_unsaved").innerHTML = "";
          console.log("You said yes!");
          pn_getSyncStorage([]);
        }
      });
    pn_getSyncStorage(entries);
  } else {
    pn_getSyncStorage(entries);
  }
}

function pn_dateSort(a, b) {
  a = new Date(a.date);
  b = new Date(b.date);
  return b - a;
}

function getNowString() {
  //Get current time for the default draft entry
  var now = new Date();
  return now.toLocaleDateString() + " " + now.toLocaleTimeString();
}

function pn_getSyncStorage(entries) {
  var id = pn_getID();
  chrome.storage.sync.get([id], function (obj) {
    console.log("result found");
    console.log({ obj });

    var nowString = getNowString();

    //If no entries are found in sync
    var firstEntry = false;
    if (
      obj == null ||
      typeof obj == "undefined" ||
      typeof obj[id] == "undefined" // Need to test if an empty object was returned
    ) {
      firstEntry = true;
    } else {
      //if an entry has been found
      //get the relevant individual's info
      // andsort the notes for that individual by date
      obj = JSON.parse(obj[id]);
      if (obj.notes.length == 0) {
        firstEntry = true;
      }
    }
    if (firstEntry) {
      // Only remove the notification if there is no draft

      console.log({ entries });
      console.log(entries.length);
      if (entries.length == 0) {
        document.querySelector("#pn_notification").innerHTML = "";
        document.querySelector("#pn_notification").classList.add("off");
        document.querySelector("#pn_entries").innerHTML =
          `<div class="draft entry"><div class="date">` +
          nowString +
          `</div><form class="pn_previewText"><textarea></textarea><input type="submit"></input><button>Cancel</button></form></div>`;
        bindEntries();
      } else {
        document.querySelector("#pn_entries").innerHTML =
          `<div class="entry"><div class="date">Draft</div><form class="pn_previewText"><textarea>` +
          entries[0].text +
          `</textarea><input type="submit"></input><button>Cancel</button></form></div>`;
        bindEntries();
      }
      return null;
    } else {
      //set the notification
      if (document.querySelector("#pn_notification").innerHTML != "<i>!</i>") {
        document.querySelector("#pn_notification").innerHTML = obj.notes.length;
        document.querySelector("#pn_notification").classList.remove("off");
      }

      //add the sync info to the existing draft entry, if any
      obj.notes.sort(pn_dateSort);
      console.log(entries);
      entries = entries.concat(obj.notes);

      //Create the HTML string to insert into the main area
      console.log({ obj });
      console.log(entries[0], entries[1]);
      var entryString = ``;
      if (entries[0].date == "Draft") {
        entryString +=
          `<div class="draft entry"><div class="date">Draft</div><form class="pn_previewText"><textarea>` +
          entries[0].text +
          `</textarea><input type="submit"></input><button>Cancel</button></form></div>`;
      } else {
        entryString +=
          `<div class="draft entry"><div class="date">` +
          nowString +
          `</div><form class="pn_previewText"><textarea></textarea><input type="submit"></input><button>Cancel</button></form></div>`;
        entryString += entryStringGen(entries[0]);
      }
      entries.splice(0, 1);
      entries.forEach((e) => {
        entryString += entryStringGen(e);
      });
      document.querySelector("#pn_entries").innerHTML = entryString;
      bindEntries();
    }
  });
}

function entryStringGen(entry) {
  return (
    `<div class="entry"><div class="date">` +
    entry.date +
    `</div><form class="pn_previewText"><textarea>` +
    entry.text +
    `</textarea><input type="submit"></input><button>Cancel</button></form><div class="pn_delete">x</div></div>`
  );
}

function stopEditing(ev) {
  ev.preventDefault();
  ev.currentTarget.parentElement.classList.remove("editing");
}

function prepSave(ev) {
  ev.preventDefault();
  ev.currentTarget.classList.remove("editing");
  console.log("date: ", ev.currentTarget.parentElement.children[0].innerHTML);
  var date = new Date(ev.currentTarget.parentElement.children[0].innerHTML);
  var dateString = date.toLocaleDateString() + " " + date.toLocaleTimeString();
  ev.currentTarget.parentElement.classList.remove("editing");
  var entries = ev.currentTarget.parentNode.parentNode.children;
  var index = Array.from(entries).indexOf(ev.currentTarget.parentNode);
  index = entries.length - index - 1;
  console.log(entries.length);
  console.log({ index });
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

function startEditing(ev) {
  console.log(ev.currentTarget.parentElement);
  if (!ev.currentTarget.parentElement.classList.contains("editing")) {
    ev.currentTarget.parentElement.classList.add("editing");
  }
}

function textChanges(ev) {
  var id = pn_getID();
  var text = ev.currentTarget.value;
  console.log({ text });
  localStorage.setItem(id, text);
}

function entryDelete(ev) {
  var id = pn_getID();
  var entry = ev.currentTarget.parentNode;
  var el = ev.currentTarget;
  var index = Array.from(entry.parentNode.children).indexOf(entry) - 1;
  console.log({ index });
  console.log(Array.from(entry.parentNode.children).indexOf(entry));
  if (index > -1) {
    chrome.storage.sync.get([id], function (result) {
      console.log(result);
      if (typeof result[id] == "undefined") {
        obj = { notes: [] };
      } else {
        obj = JSON.parse(result[id]);
      }
      console.log({ obj });
      obj.notes.sort(pn_dateSort);
      obj.notes.splice(index, 1);
      str = JSON.stringify(obj);
      var toSave = {};
      toSave[id] = str;
      chrome.storage.sync.set(toSave, function () {
        localStorage.removeItem(id);
        el.parentElement.remove();
        console.log("Value is set to ", toSave);

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

function pn_saveData(date, text, index, newest) {
  console.log({ newest });
  var id = pn_getID();
  chrome.storage.sync.get([id], function (result) {
    console.log(result);
    if (typeof result[id] == "undefined") {
      obj = { notes: [] };
    } else {
      obj = JSON.parse(result[id]);
    }
    obj.notes.sort(pn_dateSort);
    obj.notes[index] = { date: date, text: text };
    str = JSON.stringify(obj);
    var toSave = {};
    toSave[id] = str;
    chrome.storage.sync.set(toSave, function () {
      localStorage.removeItem(id);
      console.log("Value is set to ", toSave);
      if (newest) {
        addNewRow();
      }
      //pn_getSyncStorage();
    });
  });
  return false;
}

function addNewRow() {
  var nowString = getNowString();
  var newDelete = document.createElement("div");
  newDelete.classList.add("pn_delete");
  newDelete.innerHTML = "x";
  document.querySelector(".entry").append(newDelete);
  var newEl = document.createElement("div");
  newEl.classList.add("entry");
  newEl.innerHTML =
    `<div class="date">` +
    nowString +
    `</div><form class="pn_previewText"><textarea></textarea><input type="submit"></input><button>Cancel</button></form>`;
  document.querySelector("#pn_entries").prepend(newEl);
  bindEntries();
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

#pn_closeButton {
    text-align: right;
    color: black;
    font-weight: bold;
    cursor: pointer;
    width: 1rem;
    float: right;
}

#pn_unsaved {
  position: absolute;
  color: red;
  top: 3px;
  font-size: .8em;
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

.entry {
  display: grid;
  grid-template-columns: auto 1fr 1.5rem;
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
}

.pn_previewText textarea {
  height: 1.7rem;
  overflow: hidden;
  width: 100%;  
  grid-area: 1/1/3/4;
  box-sizing: border-box;
}

form.pn_previewText.editing {
  position: absolute;
  bottom: 0;
  height: calc(100% - 1.9rem);
  width: calc(100% - 1rem);
  border-top: 0.4rem solid white;
  border-right: 5px solid white;
  box-sizing: content-box;
  background-color: white;
}

.pn_previewText.editing textarea {
  height: 100%;
  grid-area: 1/1/2/4;
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
